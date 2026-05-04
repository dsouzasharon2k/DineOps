package com.platterops.vendor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {
    List<PurchaseOrder> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<PurchaseOrder> findByVendorIdOrderByCreatedAtDesc(UUID vendorId);
}
