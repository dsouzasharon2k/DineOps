package com.platterops.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WastageRepository extends JpaRepository<Wastage, UUID> {
    List<Wastage> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<Wastage> findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(UUID tenantId, java.time.LocalDateTime fromInclusive, java.time.LocalDateTime toExclusive);
}
