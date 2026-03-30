package com.platterops.subscription;

import com.platterops.dto.StartSubscriptionRequest;
import com.platterops.dto.SubscriptionResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class SubscriptionService {

    private static final int GRACE_DAYS = 7;
    private static final Map<SubscriptionPlan, Integer> MONTHLY_ORDER_LIMITS = Map.of(
            SubscriptionPlan.STARTER, 300,
            SubscriptionPlan.GROWTH, 2000,
            SubscriptionPlan.ENTERPRISE, Integer.MAX_VALUE
    );

    private final SubscriptionRepository subscriptionRepository;
    private final RestaurantRepository restaurantRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository, RestaurantRepository restaurantRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.restaurantRepository = restaurantRepository;
    }

    public SubscriptionResponse getCurrentByTenant(UUID tenantId) {
        Subscription subscription = subscriptionRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElse(null);
        if (subscription == null) {
            return null;
        }
        return toResponse(subscription, null);
    }

    @Transactional
    public SubscriptionResponse startSubscription(StartSubscriptionRequest request) {
        Restaurant tenant = restaurantRepository.findById(request.tenantId())
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        Subscription subscription = new Subscription();
        subscription.setTenant(tenant);
        subscription.setPlan(request.plan());
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartsAt(LocalDateTime.now());
        subscription.setExpiresAt(LocalDateTime.now().plusDays(30));
        String providerRef = "sub_" + UUID.randomUUID().toString().replace("-", "");
        subscription.setProviderSubscriptionRef(providerRef);
        Subscription saved = subscriptionRepository.save(subscription);

        String checkoutUrl = "/billing/checkout/" + saved.getId() + "?ref=" + providerRef;
        return toResponse(saved, checkoutUrl);
    }

    public void validateTenantCanPlaceOrder(UUID tenantId, long currentMonthOrderCount) {
        Subscription subscription = subscriptionRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Active subscription required for this tenant."));

        boolean active = isActiveOrInGrace(subscription);
        if (!active) {
            throw new IllegalArgumentException("Subscription expired. Renew to continue receiving orders.");
        }

        int limit = getMonthlyOrderLimit(subscription.getPlan());
        if (limit != Integer.MAX_VALUE && currentMonthOrderCount >= limit) {
            throw new IllegalArgumentException("Monthly order limit reached for current subscription plan.");
        }
    }

    public int getMonthlyOrderLimit(SubscriptionPlan plan) {
        return MONTHLY_ORDER_LIMITS.getOrDefault(plan, 300);
    }

    public boolean isActiveOrInGrace(Subscription subscription) {
        if (subscription.getStatus() == SubscriptionStatus.CANCELLED) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        if (!subscription.getExpiresAt().isBefore(now)) {
            return true;
        }
        return !subscription.getExpiresAt().plusDays(GRACE_DAYS).isBefore(now);
    }

    private SubscriptionResponse toResponse(Subscription subscription, String checkoutUrl) {
        return new SubscriptionResponse(
                subscription.getId(),
                subscription.getTenant().getId(),
                subscription.getPlan(),
                subscription.getStatus(),
                subscription.getStartsAt(),
                subscription.getExpiresAt(),
                subscription.getExpiresAt().isBefore(LocalDateTime.now())
                        && !subscription.getExpiresAt().plusDays(GRACE_DAYS).isBefore(LocalDateTime.now()),
                getMonthlyOrderLimit(subscription.getPlan()),
                subscription.getProviderSubscriptionRef(),
                checkoutUrl
        );
    }
}
