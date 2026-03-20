package com.dineops.dto;

import com.dineops.order.PaymentMethod;
import com.dineops.order.PaymentStatus;

import java.util.UUID;

public record InitiatePaymentResponse(
        UUID orderId,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        String providerOrderRef,
        String checkoutUrl
) {
}
