package com.platterops.vendor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorItemRepository extends JpaRepository<VendorItem, UUID> {
    List<VendorItem> findByVendorId(UUID vendorId);
    List<VendorItem> findByInventoryId(UUID inventoryId);
    Optional<VendorItem> findByVendorIdAndInventoryId(UUID vendorId, UUID inventoryId);
    void deleteByVendorIdAndInventoryId(UUID vendorId, UUID inventoryId);
}
