package com.platterops.dto;

import com.platterops.ticket.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(
        @NotNull TicketStatus status
) {}
