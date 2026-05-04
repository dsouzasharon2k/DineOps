package com.platterops.alerts;

import com.platterops.analytics.AnalyticsService;
import com.platterops.dto.AlertResponse;
import com.platterops.dto.AnalyticsSummaryResponse;
import com.platterops.dto.DailyDigestResponse;
import com.platterops.dto.FinanceSummaryResponse;
import com.platterops.dto.MenuInsightsResponse;
import com.platterops.finance.FinanceService;
import com.platterops.ticket.TicketRepository;
import com.platterops.ticket.TicketStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DailyDigestService {

    private final AnalyticsService analyticsService;
    private final FinanceService financeService;
    private final AlertService alertService;
    private final TicketRepository ticketRepository;

    public DailyDigestService(
            AnalyticsService analyticsService,
            FinanceService financeService,
            AlertService alertService,
            TicketRepository ticketRepository
    ) {
        this.analyticsService = analyticsService;
        this.financeService = financeService;
        this.alertService = alertService;
        this.ticketRepository = ticketRepository;
    }

    public DailyDigestResponse generate(UUID tenantId) {
        LocalDate today = LocalDate.now();
        LocalDateTime from = today.atStartOfDay();
        LocalDateTime to = today.plusDays(1).atStartOfDay();

        AnalyticsSummaryResponse analytics = analyticsService.getSummary(tenantId, from, to);
        FinanceSummaryResponse finance = financeService.getSummary(tenantId, today, today);
        MenuInsightsResponse insights = analyticsService.getMenuInsights(tenantId, today.minusDays(29), today);
        List<AlertResponse> alerts = alertService.getAlerts(tenantId);

        long openTickets = ticketRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, PageRequest.of(0, 200))
                .stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.OPEN || ticket.getStatus() == TicketStatus.IN_PROGRESS)
                .count();

        List<String> actions = new ArrayList<>();
        actions.addAll(insights.recommendations().stream().limit(3).toList());
        if (openTickets > 0) {
            actions.add("Resolve open operational tickets to reduce service disruption.");
        }
        if (actions.isEmpty()) {
            actions.add("No high-priority action detected today. Continue routine monitoring.");
        }

        int activeAlerts = (int) alerts.stream().filter(alert -> !"INFO".equals(alert.severity())).count();

        return new DailyDigestResponse(
                today,
                analytics.todaysRevenue(),
                analytics.todaysProfit(),
                analytics.todaysWastage(),
                finance.totalExpense(),
                openTickets,
                activeAlerts,
                actions.stream().limit(5).toList()
        );
    }
}
