package com.platterops.alerts;

import com.platterops.auth.TenantContext;
import com.platterops.dto.AlertResponse;
import com.platterops.dto.DailyDigestResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class AlertControllerTest {

    @Test
    void getAlerts_nonSuperAdminTenantMismatch_throwsAccessDenied() {
        AlertService alertService = mock(AlertService.class);
        DailyDigestService dailyDigestService = mock(DailyDigestService.class);
        AlertController controller = new AlertController(alertService, dailyDigestService);
        UUID authTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(authTenantId, "TENANT_ADMIN");

        assertThatThrownBy(() -> controller.getAlerts(UUID.randomUUID(), request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Cannot read alerts for another tenant");
    }

    @Test
    void getAlerts_superAdminCanReadAnyTenant() {
        AlertService alertService = mock(AlertService.class);
        DailyDigestService dailyDigestService = mock(DailyDigestService.class);
        AlertController controller = new AlertController(alertService, dailyDigestService);
        UUID requestedTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(UUID.randomUUID(), "SUPER_ADMIN");
        when(alertService.getAlerts(requestedTenantId)).thenReturn(List.of(sampleAlert()));

        var response = controller.getAlerts(requestedTenantId, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(alertService).getAlerts(requestedTenantId);
    }

    @Test
    void markAllAsRead_nonSuperAdminTenantMismatch_throwsAccessDenied() {
        AlertService alertService = mock(AlertService.class);
        DailyDigestService dailyDigestService = mock(DailyDigestService.class);
        AlertController controller = new AlertController(alertService, dailyDigestService);
        UUID authTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(authTenantId, "TENANT_ADMIN");

        assertThatThrownBy(() -> controller.markAllAsRead(UUID.randomUUID(), request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Cannot mark alerts as read for another tenant");
    }

    @Test
    void getDigest_nonSuperAdminMatchingTenant_returnsOk() {
        AlertService alertService = mock(AlertService.class);
        DailyDigestService dailyDigestService = mock(DailyDigestService.class);
        AlertController controller = new AlertController(alertService, dailyDigestService);
        UUID tenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(tenantId, "TENANT_ADMIN");
        when(dailyDigestService.generate(tenantId)).thenReturn(new DailyDigestResponse(
                LocalDate.now(),
                1000L,
                400L,
                50L,
                200L,
                1L,
                1,
                List.of("Reduce wastage in dairy prep")
        ));

        var response = controller.getDigest(tenantId, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(dailyDigestService).generate(tenantId);
    }

    private static MockHttpServletRequest requestForTenant(UUID tenantId, String role) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(TenantContext.ATTR_AUTH_TENANT_ID, tenantId.toString());
        request.setAttribute(TenantContext.ATTR_AUTH_ROLE, role);
        return request;
    }

    private static AlertResponse sampleAlert() {
        return new AlertResponse(
                UUID.randomUUID(),
                "WARNING",
                "KITCHEN_BACKLOG",
                "Kitchen backlog rising",
                "Pending orders have crossed the safe threshold.",
                "Add one extra cook for next 60 minutes.",
                false,
                LocalDateTime.now()
        );
    }
}
