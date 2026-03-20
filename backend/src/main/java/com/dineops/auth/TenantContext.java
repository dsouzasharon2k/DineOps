package com.dineops.auth;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class TenantContext {

    public static final String ATTR_AUTH_TENANT_ID = "authTenantId";
    public static final String ATTR_AUTH_ROLE = "authRole";
    private static final Pattern TENANT_IN_PATH =
            Pattern.compile("^/api/v1/restaurants/([0-9a-fA-F\\-]{36})(?:/.*)?$");

    private TenantContext() {
    }

    public static Optional<UUID> getAuthenticatedTenantId(HttpServletRequest request) {
        Object value = request.getAttribute(ATTR_AUTH_TENANT_ID);
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(value.toString()));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public static Optional<String> getAuthenticatedRole(HttpServletRequest request) {
        Object value = request.getAttribute(ATTR_AUTH_ROLE);
        return value == null ? Optional.empty() : Optional.of(value.toString());
    }

    public static Optional<UUID> getRequestedTenantId(HttpServletRequest request) {
        String tenantIdParam = request.getParameter("tenantId");
        if (tenantIdParam != null && !tenantIdParam.isBlank()) {
            try {
                return Optional.of(UUID.fromString(tenantIdParam));
            } catch (IllegalArgumentException ignored) {
                return Optional.empty();
            }
        }

        Matcher matcher = TENANT_IN_PATH.matcher(request.getRequestURI());
        if (matcher.matches()) {
            try {
                return Optional.of(UUID.fromString(matcher.group(1)));
            } catch (IllegalArgumentException ignored) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }
}
