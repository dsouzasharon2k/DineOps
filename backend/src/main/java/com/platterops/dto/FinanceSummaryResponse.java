package com.platterops.dto;

import java.time.LocalDate;
import java.util.List;

public record FinanceSummaryResponse(
        long totalExpense,
        List<DailyExpenseTotal> byDay,
        List<CategoryExpenseTotal> byCategory
) {
    public record DailyExpenseTotal(LocalDate date, long amount) {}

    public record CategoryExpenseTotal(String category, long amount) {}
}
