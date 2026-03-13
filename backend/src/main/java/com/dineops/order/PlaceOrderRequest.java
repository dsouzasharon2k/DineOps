package com.dineops.order;

import java.util.List;
import java.util.UUID;

// Request body for placing a new order
public record PlaceOrderRequest(
        UUID tenantId,
        String notes,
        List<OrderItemRequest> items
) {
    // Each item in the order
    public record OrderItemRequest(
            UUID menuItemId,
            Integer quantity
    ) {}
}