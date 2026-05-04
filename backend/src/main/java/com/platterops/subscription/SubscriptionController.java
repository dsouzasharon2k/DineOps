package com.platterops.subscription;

import com.platterops.auth.TenantContext;
import com.platterops.dto.StartSubscriptionRequest;
import com.platterops.dto.SubscriptionResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    public ResponseEntity<SubscriptionResponse> getCurrent(@RequestParam UUID tenantId, HttpServletRequest request) {
        UUID effectiveTenantId = resolveTenantForRead(tenantId, request);
        SubscriptionResponse response = subscriptionService.getCurrentByTenant(effectiveTenantId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/checkout")
    public ResponseEntity<SubscriptionResponse> startSubscription(
            @RequestBody @Valid StartSubscriptionRequest request
    ) {
        return ResponseEntity.status(201).body(subscriptionService.startSubscription(request));
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
            throw new AccessDeniedException("Cannot read subscription for another tenant.");
        }
        return authTenantId;
    }
}
