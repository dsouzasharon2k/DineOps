package com.platterops.dto;

import com.platterops.ticket.TicketPriority;
import com.platterops.ticket.TicketStatus;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record UpdateTicketRequest(
        TicketStatus status,
        TicketPriority priority,
        @Size(max = 150) String assignedToEmail,
        LocalDateTime slaDueAt,
        @Size(max = 2000) String resolutionNotes
) {}
