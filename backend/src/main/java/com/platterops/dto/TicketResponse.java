package com.platterops.dto;

import com.platterops.ticket.TicketPriority;
import com.platterops.ticket.TicketStatus;
import com.platterops.ticket.TicketType;

import java.time.LocalDateTime;
import java.util.UUID;

public record TicketResponse(
        UUID id,
        UUID tenantId,
        String createdByEmail,
        String title,
        String description,
        TicketType type,
        TicketPriority priority,
        TicketStatus status,
        String assignedToEmail,
        LocalDateTime slaDueAt,
        String resolutionNotes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
