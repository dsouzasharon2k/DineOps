package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record TicketCommentResponse(
        UUID id,
        UUID ticketId,
        String authorEmail,
        String body,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
