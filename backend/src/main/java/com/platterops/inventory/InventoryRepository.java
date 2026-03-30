package com.dineops.inventory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {
    List<Inventory> findByTenantIdOrderByUpdatedAtDesc(UUID tenantId);
    Optional<Inventory> findByMenuItemId(UUID menuItemId);
}
