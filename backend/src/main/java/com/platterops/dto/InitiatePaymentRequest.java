package com.platterops.dto;

import com.platterops.order.PaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Request payload for payment initiation")
public record InitiatePaymentRequest(
        @NotNull(message = "Payment method is required") PaymentMethod paymentMethod
) {
}
