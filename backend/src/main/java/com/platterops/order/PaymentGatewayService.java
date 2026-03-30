package com.platterops.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Service
public class PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(PaymentGatewayService.class);

    private final String provider;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;
    private final String frontendBaseUrl;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public PaymentGatewayService(
            @Value("${app.payment.provider:mock}") String provider,
            @Value("${app.payment.razorpay.key-id:}") String razorpayKeyId,
            @Value("${app.payment.razorpay.key-secret:}") String razorpayKeySecret,
            @Value("${app.payment.frontend-base-url:http://localhost:5173}") String frontendBaseUrl
    ) {
        this.provider = provider == null ? "mock" : provider.trim().toLowerCase();
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public PaymentInitResult createPaymentOrder(UUID orderId, int amountPaise) {
        if ("razorpay".equals(provider)) {
            return createRazorpayOrder(orderId, amountPaise);
        }
        return createMockPaymentOrder(orderId);
    }

    private PaymentInitResult createMockPaymentOrder(UUID orderId) {
        String providerOrderRef = "pay_" + UUID.randomUUID().toString().replace("-", "");
        String checkoutUrl = frontendBaseUrl + "/pay/checkout/" + orderId + "?ref=" + providerOrderRef;
        return new PaymentInitResult(providerOrderRef, checkoutUrl);
    }

    private PaymentInitResult createRazorpayOrder(UUID orderId, int amountPaise) {
        if (razorpayKeyId == null || razorpayKeyId.isBlank() || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            log.warn("razorpay_not_configured_falling_back_to_mock");
            return createMockPaymentOrder(orderId);
        }
        try {
            String payload = "{\"amount\":" + amountPaise + ",\"currency\":\"INR\",\"receipt\":\"" + orderId + "\",\"payment_capture\":1}";
            String basic = Base64.getEncoder().encodeToString((razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Authorization", "Basic " + basic)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            String providerOrderId = extractJsonField(body, "id");
            if (providerOrderId == null || providerOrderId.isBlank()) {
                throw new IllegalStateException("Missing Razorpay order id");
            }
            String checkoutUrl = frontendBaseUrl + "/pay/checkout/" + orderId + "?provider=razorpay&order_id=" + providerOrderId + "&key_id=" + razorpayKeyId;
            return new PaymentInitResult(providerOrderId, checkoutUrl);
        } catch (Exception ex) {
            log.error("razorpay_order_creation_failed orderId={} reason={}", orderId, ex.getMessage());
            return createMockPaymentOrder(orderId);
        }
    }

    private String extractJsonField(String json, String key) {
        String marker = "\"" + key + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) return null;
        int valueStart = start + marker.length();
        int valueEnd = json.indexOf('"', valueStart);
        if (valueEnd < 0) return null;
        return json.substring(valueStart, valueEnd);
    }

    public record PaymentInitResult(String providerOrderRef, String checkoutUrl) {}
}
