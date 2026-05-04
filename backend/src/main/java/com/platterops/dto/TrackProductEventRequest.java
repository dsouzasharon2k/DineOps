package com.platterops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TrackProductEventRequest(
        @NotNull UUID tenantId,
        @NotBlank String eventType,
        String sessionId,
        UUID orderId,
        String source,
        String metadata
) {
}
