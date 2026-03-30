package com.platterops.table;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DiningTableRepository extends JpaRepository<DiningTable, UUID> {
    List<DiningTable> findByTenantIdOrderByTableNumberAsc(UUID tenantId);
    Optional<DiningTable> findByTenantIdAndTableNumber(UUID tenantId, String tableNumber);
}
