package com.dineops.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    // Get all orders for a restaurant ordered by newest first (kitchen view)
    List<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    Page<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    // Get all orders for a specific customer
    List<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    List<Order> findTop10ByTenantIdAndCustomerPhoneOrderByCreatedAtDesc(UUID tenantId, String customerPhone);

    // Get active orders only (not delivered or cancelled) for kitchen view
    List<Order> findByTenantIdAndStatusNotInOrderByCreatedAtAsc(
            UUID tenantId, List<OrderStatus> excludedStatuses);
    Page<Order> findByTenantIdAndStatusNotInOrderByCreatedAtAsc(
            UUID tenantId, List<OrderStatus> excludedStatuses, Pageable pageable);

    Optional<Order> findByPaymentProviderOrderRef(String paymentProviderOrderRef);
}