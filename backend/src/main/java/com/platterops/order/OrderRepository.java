package com.platterops.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

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
        Optional<Order> findByPaymentProviderPaymentRef(String paymentProviderPaymentRef);
    long countByTenantIdAndCreatedAtGreaterThanEqual(UUID tenantId, LocalDateTime createdAt);

    List<Order> findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(UUID tenantId, LocalDateTime start, LocalDateTime end);

    @Query("""
            select o from Order o
            where (:tenantId is null or o.tenant.id = :tenantId)
              and (:status is null or o.status = :status)
              and (:fromInclusive is null or o.createdAt >= :fromInclusive)
              and (:toExclusive is null or o.createdAt < :toExclusive)
              and (
                    :query is null
                    or lower(coalesce(o.customerName, '')) like lower(concat('%', :query, '%'))
                    or lower(coalesce(o.customerPhone, '')) like lower(concat('%', :query, '%'))
                    or lower(cast(o.id as string)) like lower(concat('%', :query, '%'))
                  )
            order by o.createdAt desc
            """)
    Page<Order> adminSearch(
            @Param("tenantId") UUID tenantId,
            @Param("status") OrderStatus status,
            @Param("fromInclusive") LocalDateTime fromInclusive,
            @Param("toExclusive") LocalDateTime toExclusive,
            @Param("query") String query,
            Pageable pageable
    );

    @Query("select coalesce(max(o.invoiceNumber), 0) from Order o where o.tenant.id = :tenantId")
    long findMaxInvoiceNumberByTenantId(UUID tenantId);
}