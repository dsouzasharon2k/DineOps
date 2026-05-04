package com.platterops.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateExpenseEntryRequest(
        @NotNull LocalDate expenseDate,
        @NotNull @Size(min = 1, max = 60) String category,
        @NotNull @PositiveOrZero Long amount,
        @Size(max = 500) String notes
) {}
