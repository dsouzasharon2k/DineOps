package com.dineops.audit;

import com.dineops.dto.AuditLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String entityType, String entityId, String action, String oldValue, String newValue, UUID tenantId) {
        AuditLog log = new AuditLog();
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setTenantId(tenantId);
        log.setPerformedBy(resolveActor());
        log.setCreatedAt(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public Page<AuditLogResponse> getByTenant(UUID tenantId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLog> logs = auditLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        List<AuditLogResponse> content = logs.getContent().stream().map(this::toResponse).toList();
        return new PageImpl<>(content, pageable, logs.getTotalElements());
    }

    private String resolveActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return "system";
        }
        return auth.getName();
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getEntityType(),
                log.getEntityId(),
                log.getAction(),
                log.getOldValue(),
                log.getNewValue(),
                log.getPerformedBy(),
                log.getTenantId(),
                log.getCreatedAt()
        );
    }
}
