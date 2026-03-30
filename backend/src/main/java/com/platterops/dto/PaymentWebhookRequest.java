package com.platterops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Webhook payload from payment provider")
public record PaymentWebhookRequest(
        @NotBlank(message = "providerOrderRef is required") String providerOrderRef,
        String providerPaymentRef,
        boolean success
) {
}
