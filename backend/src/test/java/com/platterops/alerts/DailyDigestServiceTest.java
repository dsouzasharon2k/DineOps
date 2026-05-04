package com.platterops.alerts;

import com.platterops.analytics.AnalyticsService;
import com.platterops.dto.AlertResponse;
import com.platterops.dto.AnalyticsSummaryResponse;
import com.platterops.dto.FinanceSummaryResponse;
import com.platterops.dto.MenuInsightsResponse;
import com.platterops.finance.FinanceService;
import com.platterops.ticket.Ticket;
import com.platterops.ticket.TicketRepository;
import com.platterops.ticket.TicketStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class DailyDigestServiceTest {

    private AnalyticsService analyticsService;
    private FinanceService financeService;
    private AlertService alertService;
    private TicketRepository ticketRepository;
    private DailyDigestService dailyDigestService;

    @BeforeEach
    void setUp() {
        analyticsService = Mockito.mock(AnalyticsService.class);
        financeService = Mockito.mock(FinanceService.class);
        alertService = Mockito.mock(AlertService.class);
        ticketRepository = Mockito.mock(TicketRepository.class);
        dailyDigestService = new DailyDigestService(analyticsService, financeService, alertService, ticketRepository);
    }

    @Test
    void generate_shouldAggregateMetricsAndActions() {
        UUID tenantId = UUID.randomUUID();

        when(analyticsService.getSummary(eq(tenantId), any(), any())).thenReturn(new AnalyticsSummaryResponse(
                20,
                250000,
                12500,
                80000,
                5000,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                14.2
        ));

        when(financeService.getSummary(eq(tenantId), any(), any())).thenReturn(new FinanceSummaryResponse(
                20000,
                List.of(new FinanceSummaryResponse.DailyExpenseTotal(LocalDate.now(), 20000)),
                List.of(new FinanceSummaryResponse.CategoryExpenseTotal("OPERATIONS", 20000))
        ));

        when(analyticsService.getMenuInsights(eq(tenantId), any(), any())).thenReturn(new MenuInsightsResponse(
                List.of(),
                List.of("Promote STAR items in homepage highlights and combos.")
        ));

        when(alertService.getAlerts(tenantId)).thenReturn(List.of(
                new AlertResponse(UUID.randomUUID(), "WARNING", "WASTAGE_SPIKE", "Wastage spike detected", "desc", "action", false, LocalDateTime.now()),
                new AlertResponse(UUID.randomUUID(), "INFO", "NO_ACTIVE_ALERTS", "No critical alerts", "desc", "action", false, LocalDateTime.now())
        ));

        Ticket open = new Ticket();
        open.setStatus(TicketStatus.OPEN);
        Ticket closed = new Ticket();
        closed.setStatus(TicketStatus.CLOSED);
        when(ticketRepository.findByTenantIdOrderByCreatedAtDesc(eq(tenantId), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(open, closed)));

        var digest = dailyDigestService.generate(tenantId);

        assertEquals(250000, digest.todaysRevenue());
        assertEquals(80000, digest.todaysProfit());
        assertEquals(5000, digest.todaysWastage());
        assertEquals(20000, digest.todaysExpenses());
        assertEquals(1, digest.openTickets());
        assertEquals(1, digest.activeAlerts());
        assertFalse(digest.topActions().isEmpty());
    }
}
