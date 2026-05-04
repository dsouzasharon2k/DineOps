package com.platterops.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ExpenseEntryResponse(
        UUID id,
        UUID tenantId,
        LocalDate expenseDate,
        String category,
        Long amount,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
