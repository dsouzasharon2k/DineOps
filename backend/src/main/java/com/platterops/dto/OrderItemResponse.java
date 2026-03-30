package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderItemResponse(
        UUID id,
        UUID menuItemId,
        String name,
        Integer price,
        Integer quantity,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
