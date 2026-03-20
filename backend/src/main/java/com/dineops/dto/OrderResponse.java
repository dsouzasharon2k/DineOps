package com.dineops.dto;

import com.dineops.order.OrderStatus;
import com.dineops.order.PaymentMethod;
import com.dineops.order.PaymentStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        UUID tenantId,
        UserResponse customer,
        String tableNumber,
        OrderStatus status,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        Integer totalAmount,
        String notes,
        List<OrderItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
