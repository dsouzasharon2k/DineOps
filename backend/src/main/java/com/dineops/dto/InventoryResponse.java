package com.dineops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record InventoryResponse(
        UUID id,
        UUID menuItemId,
        String menuItemName,
        UUID tenantId,
        Integer quantity,
        Integer lowStockThreshold,
        boolean lowStock,
        boolean menuItemAvailable,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
