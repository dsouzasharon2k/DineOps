package com.platterops.finance;

import com.platterops.auth.TenantContext;
import com.platterops.dto.CreateExpenseEntryRequest;
import com.platterops.dto.ExpenseEntryResponse;
import com.platterops.dto.FinanceSummaryResponse;
import com.platterops.dto.PageResponse;
import com.platterops.dto.UpdateExpenseEntryRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/expenses")
    public ResponseEntity<PageResponse<ExpenseEntryResponse>> listExpenses(
            @RequestParam UUID tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest
    ) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, httpRequest);
        return ResponseEntity.ok(PageResponse.from(financeService.listExpenses(
            effectiveTenantId,
                fromDate,
                toDate,
                PageRequest.of(page, size)
        )));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ExpenseEntryResponse> createExpense(
            @RequestBody @Valid CreateExpenseEntryRequest request,
            HttpServletRequest httpRequest
    ) {
        enforceTenantWriteScope(request.tenantId(), httpRequest, "create");
        return ResponseEntity.status(201).body(financeService.createExpense(request));
    }

    @PutMapping("/expenses/{expenseId}")
    public ResponseEntity<ExpenseEntryResponse> updateExpense(
            @PathVariable UUID expenseId,
            @RequestParam UUID tenantId,
            @RequestBody @Valid UpdateExpenseEntryRequest request,
            HttpServletRequest httpRequest
    ) {
        enforceTenantWriteScope(tenantId, httpRequest, "update");
        return ResponseEntity.ok(financeService.updateExpense(expenseId, tenantId, request));
    }

    @DeleteMapping("/expenses/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable UUID expenseId,
            @RequestParam UUID tenantId,
            HttpServletRequest httpRequest
    ) {
        enforceTenantWriteScope(tenantId, httpRequest, "delete");
        financeService.deleteExpense(expenseId, tenantId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<FinanceSummaryResponse> getSummary(
            @RequestParam UUID tenantId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            HttpServletRequest httpRequest
    ) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, httpRequest);
        return ResponseEntity.ok(financeService.getSummary(effectiveTenantId, fromDate, toDate));
    }

    private static UUID resolveTenantForRead(UUID tenantId, HttpServletRequest request) {
        boolean isSuperAdmin = isSuperAdmin(request);
        if (isSuperAdmin) {
            return tenantId;
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        if (!authTenantId.equals(tenantId)) {
            throw new AccessDeniedException("Cannot read finance data for another tenant.");
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
            throw new AccessDeniedException("Cannot " + action + " expense for another tenant.");
        }
    }

    private static boolean isSuperAdmin(HttpServletRequest request) {
        return TenantContext.getAuthenticatedRole(request)
                .map("SUPER_ADMIN"::equals)
                .orElse(false);
    }
}
