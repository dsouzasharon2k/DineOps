package com.platterops.restaurant.zone;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DiningZoneRepository extends JpaRepository<DiningZone, UUID> {
    List<DiningZone> findByTenantId(UUID tenantId);
}
