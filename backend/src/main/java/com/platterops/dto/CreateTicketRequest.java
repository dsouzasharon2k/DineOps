package com.platterops.dto;

import com.platterops.ticket.TicketPriority;
import com.platterops.ticket.TicketType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTicketRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 2000) String description,
        @NotNull TicketType type,
        @NotNull TicketPriority priority
) {}
