package com.dineops.dto;

import com.dineops.order.PaymentMethod;
import com.dineops.order.PaymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

@Schema(description = "Payment initiation response payload")
public record InitiatePaymentResponse(
        UUID orderId,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        String providerOrderRef,
        String checkoutUrl
) {
}
