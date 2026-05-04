package com.platterops.analytics;

import java.util.Locale;

public enum ProductEventType {
    MENU_VIEW,
    CHECKOUT_START,
    ORDER_PLACED,
    PAYMENT_INITIATED,
    PAYMENT_SUCCEEDED;

    public static ProductEventType parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("eventType is required.");
        }
        try {
            return ProductEventType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported eventType: " + value);
        }
    }
}
