package com.dineops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "Inventory status response payload")
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
