package com.platterops.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WastageRepository extends JpaRepository<Wastage, UUID> {
    List<Wastage> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
