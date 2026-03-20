package com.dineops.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateInventoryRequest(
        @NotNull(message = "quantity is required") @Min(value = 0, message = "quantity cannot be negative") Integer quantity,
        @NotNull(message = "lowStockThreshold is required") @Min(value = 0, message = "lowStockThreshold cannot be negative") Integer lowStockThreshold
) {}
