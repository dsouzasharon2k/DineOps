package com.dineops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MenuItemResponse(
        UUID id,
        UUID tenantId,
        UUID categoryId,
        String name,
        String description,
        Integer price,
        String imageUrl,
        boolean isVegetarian,
        boolean isAvailable,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
