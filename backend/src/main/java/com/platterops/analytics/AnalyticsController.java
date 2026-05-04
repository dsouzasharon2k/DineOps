package com.platterops.analytics;

import com.platterops.auth.TenantContext;
import com.platterops.dto.AnalyticsSummaryResponse;
import com.platterops.dto.ActionRecommendationResponse;
import com.platterops.dto.ConversionFunnelResponse;
import com.platterops.dto.CustomerProfileResponse;
import com.platterops.dto.MenuInsightsResponse;
import com.platterops.dto.TrackProductEventRequest;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryResponse> getSummary(
            @RequestParam UUID tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        if (fromDate != null && toDate != null && !toDate.isBefore(fromDate)) {
            LocalDateTime from = fromDate.atStartOfDay();
            LocalDateTime toExclusive = toDate.plusDays(1).atStartOfDay();
            return ResponseEntity.ok(analyticsService.getSummary(effectiveTenantId, from, toExclusive));
        }
        return ResponseEntity.ok(analyticsService.getSummary(effectiveTenantId));
    }

    @GetMapping("/menu-insights")
    public ResponseEntity<MenuInsightsResponse> getMenuInsights(
            @RequestParam UUID tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            HttpServletRequest request
    ) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(analyticsService.getMenuInsights(effectiveTenantId, fromDate, toDate));
    }

    @GetMapping("/actions-today")
    public ResponseEntity<List<ActionRecommendationResponse>> getActionsToday(
            @RequestParam UUID tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            HttpServletRequest request
    ) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(analyticsService.getActionsToday(effectiveTenantId, fromDate, toDate));
    }

    @GetMapping("/customer-profiles")
    public ResponseEntity<List<CustomerProfileResponse>> getCustomerProfiles(
            @RequestParam UUID tenantId,
            HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(analyticsService.getCustomerProfiles(effectiveTenantId));
    }

    @PostMapping("/events")
    public ResponseEntity<Void> trackProductEvent(@Valid @RequestBody TrackProductEventRequest request) {
        analyticsService.trackProductEvent(
                request.tenantId(),
                ProductEventType.parse(request.eventType()),
                request.sessionId(),
                request.orderId(),
                request.source(),
                request.metadata()
        );
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/funnel")
    public ResponseEntity<ConversionFunnelResponse> getConversionFunnel(
            @RequestParam UUID tenantId,
            @RequestParam(defaultValue = "7") int days,
            HttpServletRequest request
    ) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(analyticsService.getConversionFunnel(effectiveTenantId, days));
    }

    private static UUID resolveTenantForRead(UUID tenantId, HttpServletRequest request) {
        boolean isSuperAdmin = TenantContext.getAuthenticatedRole(request)
                .map("SUPER_ADMIN"::equals)
                .orElse(false);
        if (isSuperAdmin) {
            return tenantId;
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        if (!authTenantId.equals(tenantId)) {
            throw new AccessDeniedException("Cannot read analytics for another tenant.");
        }
        return authTenantId;
    }
}
