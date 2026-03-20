package com.dineops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Request payload for updating inventory levels")
public record UpdateInventoryRequest(
        @NotNull(message = "quantity is required") @Min(value = 0, message = "quantity cannot be negative") Integer quantity,
        @NotNull(message = "lowStockThreshold is required") @Min(value = 0, message = "lowStockThreshold cannot be negative") Integer lowStockThreshold
) {}
