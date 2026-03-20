package com.dineops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MenuCategoryResponse(
        UUID id,
        UUID tenantId,
        String name,
        String description,
        Integer displayOrder,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
