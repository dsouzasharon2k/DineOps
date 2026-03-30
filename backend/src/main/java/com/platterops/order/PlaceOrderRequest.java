package com.platterops.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

// Request body for placing a new order
public record PlaceOrderRequest(
        @NotNull(message = "Tenant ID is required") UUID tenantId,
        String tableNumber,
        String customerName,
        String customerPhone,
        String customerEmail,
        String notes,
        @NotEmpty(message = "Order must contain at least one item") @Valid List<OrderItemRequest> items
) {
    // Each item in the order
    public record OrderItemRequest(
            @NotNull(message = "Menu item ID is required") UUID menuItemId,
            @NotNull(message = "Quantity is required") @jakarta.validation.constraints.Min(value = 1, message = "Quantity must be at least 1") Integer quantity
    ) {}
}