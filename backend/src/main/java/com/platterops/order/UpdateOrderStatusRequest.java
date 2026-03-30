package com.platterops.order;

import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull(message = "status is required") OrderStatus status
) {
}
