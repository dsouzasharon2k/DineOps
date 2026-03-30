package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        String entityType,
        String entityId,
        String action,
        String oldValue,
        String newValue,
        String performedBy,
        UUID tenantId,
        LocalDateTime createdAt
) {
}
