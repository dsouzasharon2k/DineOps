package com.platterops.dto;

import com.platterops.order.OrderStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderStatusHistoryResponse(
        UUID id,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        String changedBy,
        LocalDateTime changedAt
) {
}
