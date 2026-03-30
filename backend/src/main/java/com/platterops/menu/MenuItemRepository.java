package com.platterops.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    // Get all available items for a specific category
    List<MenuItem> findByCategory_IdAndIsAvailableTrueOrderByDisplayOrderAsc(UUID categoryId);

    // Get all available items for a tenant (used for full menu view)
    List<MenuItem> findByTenant_IdAndIsAvailableTrueOrderByDisplayOrderAsc(UUID tenantId);

    // Get all non-deleted items regardless of availability (for admin menu management)
    // @SQLRestriction on MenuItem already filters deleted_at IS NULL globally
    List<MenuItem> findByCategory_IdOrderByDisplayOrderAsc(UUID categoryId);
}