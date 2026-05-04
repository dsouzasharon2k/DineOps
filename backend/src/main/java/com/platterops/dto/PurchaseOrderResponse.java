package com.platterops.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderResponse(
        UUID id,
        UUID tenantId,
        UUID vendorId,
        String vendorName,
        String vendorPhone,
        String status,
        Long totalAmount,
        String notes,
        LocalDateTime receivedAt,
        List<POItemDetail> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record POItemDetail(
            UUID id,
            UUID inventoryId,
            String itemName,
            BigDecimal quantity,
            String unit,
            Long unitPrice,
            Long totalPrice
    ) {}
}
