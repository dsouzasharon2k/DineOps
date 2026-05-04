package com.platterops.review;

import com.platterops.auth.TenantContext;
import com.platterops.dto.ReviewResponse;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class ReviewControllerTest {

    @Test
    void getReviewsByTenant_nonSuperAdminTenantMismatch_throwsAccessDenied() {
        ReviewService service = mock(ReviewService.class);
        ReviewController controller = new ReviewController(service);

        MockHttpServletRequest request = requestForTenant(UUID.randomUUID(), "TENANT_ADMIN");

        assertThatThrownBy(() -> controller.getReviewsByTenant(UUID.randomUUID(), 0, 20, request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Cannot read reviews for another tenant");
    }

    @Test
    void getReviewsByTenant_nonSuperAdminMatchingTenant_returnsOk() {
        ReviewService service = mock(ReviewService.class);
        ReviewController controller = new ReviewController(service);
        UUID tenantId = UUID.randomUUID();

        MockHttpServletRequest request = requestForTenant(tenantId, "TENANT_ADMIN");
        Page<ReviewResponse> page = new PageImpl<>(List.of(new ReviewResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                tenantId,
                5,
                "Great",
                LocalDateTime.now()
        )));
        when(service.getReviewsByTenant(tenantId, 0, 20)).thenReturn(page);

        var response = controller.getReviewsByTenant(tenantId, 0, 20, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(service).getReviewsByTenant(tenantId, 0, 20);
    }

    private static MockHttpServletRequest requestForTenant(UUID tenantId, String role) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(TenantContext.ATTR_AUTH_TENANT_ID, tenantId.toString());
        request.setAttribute(TenantContext.ATTR_AUTH_ROLE, role);
        return request;
    }
}
