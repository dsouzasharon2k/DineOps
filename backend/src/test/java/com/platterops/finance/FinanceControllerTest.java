package com.platterops.finance;

import com.platterops.auth.TenantContext;
import com.platterops.dto.CreateExpenseEntryRequest;
import com.platterops.dto.ExpenseEntryResponse;
import com.platterops.dto.UpdateExpenseEntryRequest;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class FinanceControllerTest {

    @Test
    void listExpenses_nonSuperAdminTenantMismatch_throwsAccessDenied() {
        FinanceService service = mock(FinanceService.class);
        FinanceController controller = new FinanceController(service);
        UUID authTenantId = UUID.randomUUID();
        UUID requestedTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(authTenantId, "TENANT_ADMIN");

        assertThatThrownBy(() -> controller.listExpenses(
                requestedTenantId,
                null,
                null,
                0,
                20,
                request
        )).isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Cannot read finance data for another tenant");
    }

    @Test
    void listExpenses_nonSuperAdminUsesAuthenticatedTenant() {
        FinanceService service = mock(FinanceService.class);
        FinanceController controller = new FinanceController(service);
        UUID authTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(authTenantId, "TENANT_ADMIN");
        Page<ExpenseEntryResponse> page = new PageImpl<>(List.of(sampleResponse(authTenantId)));
        when(service.listExpenses(eq(authTenantId), eq(null), eq(null), any(Pageable.class))).thenReturn(page);

        var response = controller.listExpenses(authTenantId, null, null, 0, 20, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(service).listExpenses(eq(authTenantId), eq(null), eq(null), any(Pageable.class));
    }

    @Test
    void updateExpense_nonSuperAdminTenantMismatch_throwsAccessDenied() {
        FinanceService service = mock(FinanceService.class);
        FinanceController controller = new FinanceController(service);
        UUID authTenantId = UUID.randomUUID();
        UUID requestedTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(authTenantId, "TENANT_ADMIN");

        assertThatThrownBy(() -> controller.updateExpense(
                UUID.randomUUID(),
                requestedTenantId,
                new UpdateExpenseEntryRequest(LocalDate.now(), "OPERATIONS", 100L, "test"),
                request
        )).isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Cannot update expense for another tenant");
    }

    @Test
    void createExpense_superAdminCanWriteAnyTenant() {
        FinanceService service = mock(FinanceService.class);
        FinanceController controller = new FinanceController(service);
        UUID tenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(UUID.randomUUID(), "SUPER_ADMIN");
        CreateExpenseEntryRequest payload = new CreateExpenseEntryRequest(
                tenantId,
                LocalDate.now(),
                "OPERATIONS",
                100L,
                "note"
        );

        when(service.createExpense(payload)).thenReturn(sampleResponse(tenantId));

        var response = controller.createExpense(payload, request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        verify(service).createExpense(payload);
    }

    private static MockHttpServletRequest requestForTenant(UUID tenantId, String role) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(TenantContext.ATTR_AUTH_TENANT_ID, tenantId.toString());
        request.setAttribute(TenantContext.ATTR_AUTH_ROLE, role);
        return request;
    }

    private static ExpenseEntryResponse sampleResponse(UUID tenantId) {
        return new ExpenseEntryResponse(
                UUID.randomUUID(),
                tenantId,
                LocalDate.now(),
                "OPERATIONS",
                100L,
                "note",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }
}
