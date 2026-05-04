package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AlertResponse(
        UUID id,
        String severity,
        String type,
        String title,
        String description,
        String action,
        boolean read,
        LocalDateTime createdAt
) {
}
