package com.dineops.table;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDiningTableRequest(
        @NotBlank(message = "Table number is required") String tableNumber,
        @NotNull(message = "Capacity is required")
        @Min(value = 1, message = "Capacity must be at least 1") Integer capacity
) {
}
