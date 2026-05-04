package com.platterops.dto;

public record ConversionFunnelResponse(
        int windowDays,
        long menuViews,
        long checkoutStarts,
        long ordersPlaced,
        long paymentsInitiated,
        long paymentsSucceeded,
        double menuToCheckoutRatePct,
        double checkoutToOrderRatePct,
        double orderToPaymentSuccessRatePct
) {
}
