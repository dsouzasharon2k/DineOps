package com.platterops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "Review response payload")
public record ReviewResponse(
        UUID id,
        UUID orderId,
        UUID tenantId,
        int rating,
        String comment,
        LocalDateTime createdAt
) {}
