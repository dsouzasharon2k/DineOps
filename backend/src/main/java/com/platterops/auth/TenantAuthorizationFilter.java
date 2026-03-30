package com.dineops.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.http.HttpMethod;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
public class TenantAuthorizationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String requestUri = String.valueOf(request.getRequestURI());
        // Public menu/catalog endpoints are intentionally tenant-scoped but allow anonymous GET access.
        if (HttpMethod.GET.matches(request.getMethod()) && requestUri.startsWith("/api/v1/restaurants/")) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<UUID> requestedTenantId = TenantContext.getRequestedTenantId(request);
        if (requestedTenantId.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<String> role = TenantContext.getAuthenticatedRole(request);
        if (role.isPresent() && "SUPER_ADMIN".equals(role.get())) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<UUID> authTenantId = TenantContext.getAuthenticatedTenantId(request);
        if (authTenantId.isPresent() && authTenantId.get().equals(requestedTenantId.get())) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Access denied\"}");
    }
}
