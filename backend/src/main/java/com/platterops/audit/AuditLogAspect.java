package com.platterops.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.UUID;

@Aspect
@Component
public class AuditLogAspect {

    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public AuditLogAspect(AuditLogService auditLogService, ObjectMapper objectMapper) {
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(auditedAction)")
    public Object around(ProceedingJoinPoint joinPoint, AuditedAction auditedAction) throws Throwable {
        Object result = joinPoint.proceed();
        Object[] args = joinPoint.getArgs();
        String oldValue = serialize(args);
        String newValue = serialize(result);
        String entityId = resolveEntityId(result);
        UUID tenantId = resolveTenantId(args, result);
        auditLogService.log(
                auditedAction.entityType(),
                entityId,
                auditedAction.action(),
                oldValue,
                newValue,
                tenantId
        );
        return result;
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "\"serialization_failed\"";
        }
    }

    private UUID resolveTenantId(Object[] args, Object result) {
        for (Object arg : args) {
            if (arg instanceof UUID uuid) {
                return uuid;
            }
        }
        UUID tenantFromResult = readUuidProperty(result, "tenantId");
        if (tenantFromResult != null) {
            return tenantFromResult;
        }
        return readNestedUuid(result, "tenant", "id");
    }

    private String resolveEntityId(Object result) {
        UUID id = readUuidProperty(result, "id");
        return id == null ? null : id.toString();
    }

    private UUID readUuidProperty(Object source, String getterNameBase) {
        if (source == null) {
            return null;
        }
        try {
            Method getter = source.getClass().getMethod("get" + capitalize(getterNameBase));
            Object value = getter.invoke(source);
            return value instanceof UUID uuid ? uuid : null;
        } catch (ReflectiveOperationException ignored) {
            try {
                Method recordAccessor = source.getClass().getMethod(getterNameBase);
                Object value = recordAccessor.invoke(source);
                return value instanceof UUID uuid ? uuid : null;
            } catch (ReflectiveOperationException ignoredToo) {
                return null;
            }
        }
    }

    private UUID readNestedUuid(Object source, String nestedAccessor, String leafAccessor) {
        if (source == null) {
            return null;
        }
        try {
            Method nestedMethod = source.getClass().getMethod("get" + capitalize(nestedAccessor));
            Object nested = nestedMethod.invoke(source);
            if (nested == null) {
                return null;
            }
            Method leafMethod = nested.getClass().getMethod("get" + capitalize(leafAccessor));
            Object leaf = leafMethod.invoke(nested);
            return leaf instanceof UUID uuid ? uuid : null;
        } catch (ReflectiveOperationException ignored) {
            return null;
        }
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }
}
