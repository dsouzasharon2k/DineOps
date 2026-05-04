package com.platterops.audit;

import com.platterops.auth.TenantContext;
import com.platterops.dto.AuditLogResponse;
import com.platterops.dto.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-log")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<AuditLogResponse>> getAuditLogs(
            @RequestParam UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(PageResponse.from(auditLogService.getByTenant(effectiveTenantId, page, size)));
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
            throw new AccessDeniedException("Cannot read audit logs for another tenant.");
        }
        return authTenantId;
    }
}
