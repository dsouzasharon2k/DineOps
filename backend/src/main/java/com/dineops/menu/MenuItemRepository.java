package com.dineops.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    // Get all available items for a specific category
    List<MenuItem> findByCategoryIdAndIsAvailableTrueOrderByDisplayOrderAsc(UUID categoryId);

    // Get all available items for a tenant (used for full menu view)
    List<MenuItem> findByTenantIdAndIsAvailableTrueOrderByDisplayOrderAsc(UUID tenantId);
}