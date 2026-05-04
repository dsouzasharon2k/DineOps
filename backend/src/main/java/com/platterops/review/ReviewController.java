package com.platterops.review;

import com.platterops.auth.TenantContext;
import com.platterops.dto.PageResponse;
import com.platterops.dto.ReviewResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<ReviewResponse>> getReviewsByTenant(
            @RequestParam UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request
    ) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        return ResponseEntity.ok(PageResponse.from(reviewService.getReviewsByTenant(effectiveTenantId, page, size)));
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
            throw new AccessDeniedException("Cannot read reviews for another tenant.");
        }
        return authTenantId;
    }
}
