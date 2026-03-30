package com.platterops.restaurant.zone;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface QrTemplateRepository extends JpaRepository<QrTemplate, UUID> {
    
    @Query("SELECT t FROM QrTemplate t WHERE t.isPublic = true OR t.tenantId = :tenantId")
    List<QrTemplate> findAvailableTemplates(UUID tenantId);
}
