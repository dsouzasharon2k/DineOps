package com.dineops.dto;

import com.dineops.table.DiningTableStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record DiningTableResponse(
        UUID id,
        UUID tenantId,
        String tableNumber,
        Integer capacity,
        DiningTableStatus status,
        String qrCodeUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
