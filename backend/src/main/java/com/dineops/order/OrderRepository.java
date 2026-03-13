package com.dineops.order;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    // Get all orders for a restaurant ordered by newest first (kitchen view)
    List<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    // Get all orders for a specific customer
    List<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    // Get active orders only (not delivered or cancelled) for kitchen view
    List<Order> findByTenantIdAndStatusNotInOrderByCreatedAtAsc(
            UUID tenantId, List<OrderStatus> excludedStatuses);
}