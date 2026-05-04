package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderDisputeResponse(
        UUID id,
        UUID orderId,
        UUID tenantId,
        String issueType,
        String details,
        String customerName,
        String customerPhone,
        String status,
        LocalDateTime createdAt
) {}
