package com.platterops.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateWastageRequest(
        @NotNull(message = "Tenant ID is required") UUID tenantId,
        @NotNull(message = "Menu item ID is required") UUID menuItemId,
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1") Integer quantity,
        String reason
) {
}
