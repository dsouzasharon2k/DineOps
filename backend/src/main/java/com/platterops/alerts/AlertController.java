package com.platterops.alerts;

import com.platterops.auth.TenantContext;
import com.platterops.dto.AlertResponse;
import com.platterops.dto.AlertUnreadCountResponse;
import com.platterops.dto.DailyDigestResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {

    private final AlertService alertService;
    private final DailyDigestService dailyDigestService;

    public AlertController(AlertService alertService, DailyDigestService dailyDigestService) {
        this.alertService = alertService;
        this.dailyDigestService = dailyDigestService;
    }

    @GetMapping("/summary")
    public ResponseEntity<List<AlertResponse>> getAlerts(@RequestParam UUID tenantId, HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(alertService.getAlerts(effectiveTenantId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<AlertUnreadCountResponse> getUnreadCount(@RequestParam UUID tenantId, HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(new AlertUnreadCountResponse(alertService.getUnreadCount(effectiveTenantId)));
    }

    @PatchMapping("/{alertId}/read")
    public ResponseEntity<AlertResponse> markAlertAsRead(@PathVariable UUID alertId,
                                                         @RequestParam UUID tenantId,
                                                         HttpServletRequest request) {
        enforceTenantWriteScope(tenantId, request, "mark alert as read");
        return ResponseEntity.ok(alertService.markAsRead(tenantId, alertId));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<AlertUnreadCountResponse> markAllAsRead(@RequestParam UUID tenantId, HttpServletRequest request) {
        enforceTenantWriteScope(tenantId, request, "mark alerts as read");
        return ResponseEntity.ok(new AlertUnreadCountResponse(alertService.markAllAsRead(tenantId)));
    }

    @GetMapping("/digest")
    public ResponseEntity<DailyDigestResponse> getDigest(@RequestParam UUID tenantId, HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(dailyDigestService.generate(effectiveTenantId));
    }

    private static UUID resolveTenantForRead(UUID tenantId, HttpServletRequest request) {
        if (isSuperAdmin(request)) {
            return tenantId;
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        if (!authTenantId.equals(tenantId)) {
            throw new AccessDeniedException("Cannot read alerts for another tenant.");
        }
        return authTenantId;
    }

    private static void enforceTenantWriteScope(UUID tenantId, HttpServletRequest request, String action) {
        if (isSuperAdmin(request)) {
            return;
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        if (!authTenantId.equals(tenantId)) {
            throw new AccessDeniedException("Cannot " + action + " for another tenant.");
        }
    }

    private static boolean isSuperAdmin(HttpServletRequest request) {
        return TenantContext.getAuthenticatedRole(request)
                .map("SUPER_ADMIN"::equals)
                .orElse(false);
    }
}
