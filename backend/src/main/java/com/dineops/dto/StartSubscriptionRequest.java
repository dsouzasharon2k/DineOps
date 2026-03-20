package com.dineops.dto;

import com.dineops.subscription.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StartSubscriptionRequest(
        @NotNull(message = "tenantId is required") UUID tenantId,
        @NotNull(message = "plan is required") SubscriptionPlan plan
) {}
