package com.dineops.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MenuCategoryRepository extends JpaRepository<MenuCategory, UUID> {

    // Find all active categories for a specific restaurant (tenant)
    // Spring Data JPA generates the query automatically from the method name
    List<MenuCategory> findByTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID tenantId);
}