package com.platterops.dto;

import com.platterops.subscription.SubscriptionPlan;
import com.platterops.subscription.SubscriptionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "Subscription and billing status response")
public record SubscriptionResponse(
        UUID id,
        UUID tenantId,
        SubscriptionPlan plan,
        SubscriptionStatus status,
        LocalDateTime startsAt,
        LocalDateTime expiresAt,
        boolean inGracePeriod,
        int monthlyOrderLimit,
        String providerSubscriptionRef,
        String checkoutUrl
) {}
