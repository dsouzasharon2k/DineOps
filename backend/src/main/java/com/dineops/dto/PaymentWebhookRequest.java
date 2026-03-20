package com.dineops.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentWebhookRequest(
        @NotBlank(message = "providerOrderRef is required") String providerOrderRef,
        String providerPaymentRef,
        boolean success
) {
}
