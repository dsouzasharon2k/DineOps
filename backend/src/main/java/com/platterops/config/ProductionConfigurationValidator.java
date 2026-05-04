package com.platterops.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Component
@Profile("prod")
public class ProductionConfigurationValidator {
    private final Environment environment;

    public ProductionConfigurationValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        List<String> errors = new ArrayList<>();

        validateJwtSecret(errors);
        validateCorsOrigins(errors);
        validateFrontendUrls(errors);
        validateProviders(errors);

        if (!errors.isEmpty()) {
            throw new IllegalStateException(
                "Production configuration validation failed:\n - " + String.join("\n - ", errors)
            );
        }
    }

    private void validateJwtSecret(List<String> errors) {
        String secret = trimmed(environment.getProperty("app.jwt.secret"));
        if (secret == null) {
            errors.add("JWT secret is missing. Set JWT_SECRET.");
            return;
        }
        if (secret.length() < 32) {
            errors.add("JWT secret is too short. Use at least 32 characters (64 hex chars recommended).");
        }
        if (looksLikePlaceholder(secret)) {
            errors.add("JWT secret still looks like a placeholder. Replace JWT_SECRET with a real secret.");
        }
    }

    private void validateCorsOrigins(List<String> errors) {
        String allowedOrigins = trimmed(environment.getProperty("app.cors.allowed-origins"));
        if (allowedOrigins == null) {
            errors.add("CORS allowed origins are missing. Set CORS_ALLOWED_ORIGINS.");
            return;
        }

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();

        if (origins.isEmpty()) {
            errors.add("CORS allowed origins are empty.");
            return;
        }

        for (String origin : origins) {
            String normalized = origin.toLowerCase(Locale.ROOT);
            if (normalized.contains("localhost") || normalized.contains("127.0.0.1")) {
                errors.add("CORS_ALLOWED_ORIGINS must not contain localhost/127.0.0.1 in prod.");
                break;
            }
            if (!normalized.startsWith("https://")) {
                errors.add("CORS origin must use HTTPS in prod: " + origin);
                break;
            }
        }
    }

    private void validateFrontendUrls(List<String> errors) {
        validateHttpsUrl("app.frontend-base-url", "FRONTEND_BASE_URL", errors);
        validateHttpsUrl("app.payment.frontend-base-url", "PAYMENT_FRONTEND_BASE_URL", errors);
    }

    private void validateProviders(List<String> errors) {
        String smsProvider = lower(environment.getProperty("app.sms.provider"));
        String emailProvider = lower(environment.getProperty("app.email.provider"));
        String paymentProvider = lower(environment.getProperty("app.payment.provider"));

        if (smsProvider == null || "mock".equals(smsProvider)) {
            errors.add("SMS provider is mock/missing. Set SMS_PROVIDER to a real provider (msg91/twilio).");
        }
        if (emailProvider == null || "mock".equals(emailProvider)) {
            errors.add("Email provider is mock/missing. Set EMAIL_PROVIDER to smtp (or another real provider).");
        }
        if (paymentProvider == null || "mock".equals(paymentProvider)) {
            errors.add("Payment provider is mock/missing. Set PAYMENT_PROVIDER to razorpay (or another real provider).");
        }

        if ("msg91".equals(smsProvider)) {
            require("app.sms.msg91.auth-key", "MSG91_AUTH_KEY", errors);
            require("app.sms.msg91.template-id", "MSG91_TEMPLATE_ID", errors);
        }
        if ("twilio".equals(smsProvider)) {
            require("app.sms.twilio.account-sid", "TWILIO_ACCOUNT_SID", errors);
            require("app.sms.twilio.auth-token", "TWILIO_AUTH_TOKEN", errors);
            require("app.sms.twilio.from-number", "TWILIO_FROM_NUMBER", errors);
        }

        if ("smtp".equals(emailProvider)) {
            require("spring.mail.host", "MAIL_HOST", errors);
            require("spring.mail.username", "MAIL_USERNAME", errors);
            require("spring.mail.password", "MAIL_PASSWORD", errors);
        }

        if ("razorpay".equals(paymentProvider)) {
            require("app.payment.razorpay.key-id", "RAZORPAY_KEY_ID", errors);
            require("app.payment.razorpay.key-secret", "RAZORPAY_KEY_SECRET", errors);
            require("app.payment.webhook-shared-secret", "PAYMENT_WEBHOOK_SHARED_SECRET", errors);
        }
    }

    private void validateHttpsUrl(String propertyName, String envVarName, List<String> errors) {
        String value = trimmed(environment.getProperty(propertyName));
        if (value == null) {
            errors.add(envVarName + " is missing.");
            return;
        }

        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.contains("localhost") || normalized.contains("127.0.0.1")) {
            errors.add(envVarName + " must not point to localhost in prod.");
            return;
        }
        if (!normalized.startsWith("https://")) {
            errors.add(envVarName + " must use HTTPS in prod.");
        }
    }

    private void require(String propertyName, String envVarName, List<String> errors) {
        String value = trimmed(environment.getProperty(propertyName));
        if (value == null || looksLikePlaceholder(value)) {
            errors.add("Missing or placeholder value for " + envVarName + ".");
        }
    }

    @Nullable
    private String trimmed(@Nullable String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() ? null : result;
    }

    @Nullable
    private String lower(@Nullable String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean looksLikePlaceholder(@Nullable String value) {
        if (value == null) return true;
        String normalized = value.toLowerCase(Locale.ROOT);
        return normalized.contains("replace_with")
            || normalized.contains("change-me")
            || normalized.contains("your_")
            || normalized.contains("<");
    }
}
