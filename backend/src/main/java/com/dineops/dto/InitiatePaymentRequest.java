package com.dineops.dto;

import com.dineops.order.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record InitiatePaymentRequest(
        @NotNull(message = "Payment method is required") PaymentMethod paymentMethod
) {
}
