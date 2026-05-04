package com.platterops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateExpenseEntryRequest(
        @NotNull UUID tenantId,
        @NotNull LocalDate expenseDate,
        @NotBlank @Size(max = 60) String category,
        @NotNull @PositiveOrZero Long amount,
        @Size(max = 500) String notes
) {}
