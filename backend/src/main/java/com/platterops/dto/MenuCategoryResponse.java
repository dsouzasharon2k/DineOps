package com.platterops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "Menu category response payload")
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
