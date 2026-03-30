package com.platterops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

@Schema(description = "Request payload for creating inventory tracking")
public record CreateInventoryRequest(
        @NotNull(message = "menuItemId is required") UUID menuItemId,
        @NotNull(message = "quantity is required") @Min(value = 0, message = "quantity cannot be negative") Integer quantity,
        @NotNull(message = "lowStockThreshold is required") @Min(value = 0, message = "lowStockThreshold cannot be negative") Integer lowStockThreshold
) {}
