package com.platterops.dto;

import com.platterops.order.PaymentMethod;
import com.platterops.order.PaymentStatus;
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
