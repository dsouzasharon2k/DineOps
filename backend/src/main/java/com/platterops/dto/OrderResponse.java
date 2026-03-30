package com.platterops.dto;

import com.platterops.order.OrderStatus;
import com.platterops.order.PaymentMethod;
import com.platterops.order.PaymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Schema(description = "Order response payload")
public record OrderResponse(
        @Schema(description = "Order ID") UUID id,
        @Schema(description = "Tenant (restaurant) ID") UUID tenantId,
        UserResponse customer,
        String tableNumber,
        OrderStatus status,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        Integer estimatedReadyMinutes,
        Integer totalAmount,
        String notes,
        List<OrderItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
