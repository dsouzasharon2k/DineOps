package com.platterops.dto;

import com.platterops.subscription.SubscriptionPlan;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

@Schema(description = "Request payload to start subscription checkout")
public record StartSubscriptionRequest(
        @NotNull(message = "tenantId is required") UUID tenantId,
        @NotNull(message = "plan is required") SubscriptionPlan plan
) {}
