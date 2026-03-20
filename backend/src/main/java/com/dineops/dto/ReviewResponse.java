package com.dineops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID orderId,
        UUID tenantId,
        int rating,
        String comment,
        LocalDateTime createdAt
) {}
