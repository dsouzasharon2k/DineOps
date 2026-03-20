package com.dineops.dto;

import com.dineops.order.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        UUID tenantId,
        UserResponse customer,
        OrderStatus status,
        Integer totalAmount,
        String notes,
        List<OrderItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
