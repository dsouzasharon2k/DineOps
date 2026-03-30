package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record WastageResponse(
        UUID id,
        UUID tenantId,
        UUID menuItemId,
        String menuItemName,
        Integer quantity,
        Long unitCost,
        String reason,
        LocalDateTime createdAt
) {
}
