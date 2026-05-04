package com.platterops.dto;

import java.time.LocalDate;
import java.util.List;

public record DailyDigestResponse(
        LocalDate date,
        long todaysRevenue,
        long todaysProfit,
        long todaysWastage,
        long todaysExpenses,
        long openTickets,
        int activeAlerts,
        List<String> topActions
) {
}
