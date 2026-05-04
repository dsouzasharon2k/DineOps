package com.platterops.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface OrderDisputeRepository extends JpaRepository<OrderDispute, UUID> {
    @Query("select d from OrderDispute d where d.tenant.id = :tenantId order by d.createdAt desc")
    Page<OrderDispute> findByTenantIdOrderByCreatedAtDesc(@Param("tenantId") UUID tenantId, Pageable pageable);
}
