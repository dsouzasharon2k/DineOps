package com.dineops.dto;

import com.dineops.subscription.SubscriptionPlan;
import com.dineops.subscription.SubscriptionStatus;

import java.time.LocalDateTime;
import java.util.UUID;

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
