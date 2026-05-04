package com.platterops.analytics;

import com.platterops.auth.TenantContext;
import com.platterops.dto.ActionRecommendationResponse;
import com.platterops.dto.AnalyticsSummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class AnalyticsControllerTest {

    @Test
    void getSummary_nonSuperAdminTenantMismatch_throwsAccessDenied() {
        AnalyticsService service = mock(AnalyticsService.class);
        AnalyticsController controller = new AnalyticsController(service);

        MockHttpServletRequest request = requestForTenant(UUID.randomUUID(), "TENANT_ADMIN");

        assertThatThrownBy(() -> controller.getSummary(UUID.randomUUID(), null, null, request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Cannot read analytics for another tenant");
    }

    @Test
    void getSummary_nonSuperAdminMatchingTenant_returnsOk() {
        AnalyticsService service = mock(AnalyticsService.class);
        AnalyticsController controller = new AnalyticsController(service);
        UUID tenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(tenantId, "TENANT_ADMIN");
        when(service.getSummary(tenantId)).thenReturn(new AnalyticsSummaryResponse(
                0,
                0,
                0,
                0,
                0,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                0
        ));

        var response = controller.getSummary(tenantId, null, null, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(service).getSummary(tenantId);
    }

    @Test
    void getActionsToday_superAdminCanReadAnyTenant() {
        AnalyticsService service = mock(AnalyticsService.class);
        AnalyticsController controller = new AnalyticsController(service);
        UUID requestedTenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(UUID.randomUUID(), "SUPER_ADMIN");
        when(service.getActionsToday(requestedTenantId, null, null)).thenReturn(List.of(
                new ActionRecommendationResponse("Title", "Why", 1000L, "24h")
        ));

        var response = controller.getActionsToday(requestedTenantId, null, null, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(service).getActionsToday(requestedTenantId, null, null);
    }

    private static MockHttpServletRequest requestForTenant(UUID tenantId, String role) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(TenantContext.ATTR_AUTH_TENANT_ID, tenantId.toString());
        request.setAttribute(TenantContext.ATTR_AUTH_ROLE, role);
        return request;
    }
}
