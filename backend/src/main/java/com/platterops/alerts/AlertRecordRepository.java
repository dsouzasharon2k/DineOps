package com.platterops.alerts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertRecordRepository extends JpaRepository<AlertRecord, UUID> {

    List<AlertRecord> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    List<AlertRecord> findByTenantIdAndIsReadFalseOrderByCreatedAtDesc(UUID tenantId);

    long countByTenantIdAndIsReadFalse(UUID tenantId);

    Optional<AlertRecord> findTopByTenantIdAndTypeAndIsReadFalseOrderByCreatedAtDesc(UUID tenantId, String type);

    Optional<AlertRecord> findByIdAndTenantId(UUID id, UUID tenantId);
}
