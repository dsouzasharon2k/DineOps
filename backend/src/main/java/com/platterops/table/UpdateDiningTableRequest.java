package com.platterops.table;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateDiningTableRequest(
        @NotNull(message = "Capacity is required")
        @Min(value = 1, message = "Capacity must be at least 1") Integer capacity,
        @NotNull(message = "Status is required") DiningTableStatus status
) {
}
