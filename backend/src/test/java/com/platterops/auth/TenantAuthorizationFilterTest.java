package com.platterops.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TenantAuthorizationFilterTest {

    private TenantAuthorizationFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new TenantAuthorizationFilter();
        request = Mockito.mock(HttpServletRequest.class);
        response = Mockito.mock(HttpServletResponse.class);
        filterChain = Mockito.mock(FilterChain.class);
        StringWriter sink = new StringWriter();
        PrintWriter writer = new PrintWriter(sink);
        try {
            when(response.getWriter()).thenReturn(writer);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void allowsRequest_whenTenantMatchesAuthenticatedTenant() throws Exception {
        UUID tenantId = UUID.randomUUID();
        when(request.getRequestURI()).thenReturn("/api/v1/restaurants/" + tenantId + "/categories");
        when(request.getParameter("tenantId")).thenReturn(null);
        when(request.getAttribute(TenantContext.ATTR_AUTH_ROLE)).thenReturn("TENANT_ADMIN");
        when(request.getAttribute(TenantContext.ATTR_AUTH_TENANT_ID)).thenReturn(tenantId.toString());

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void deniesRequest_whenTenantDoesNotMatchAuthenticatedTenant() throws Exception {
        UUID tokenTenantId = UUID.randomUUID();
        UUID requestedTenantId = UUID.randomUUID();
        when(request.getRequestURI()).thenReturn("/api/v1/restaurants/" + requestedTenantId + "/categories");
        when(request.getParameter("tenantId")).thenReturn(null);
        when(request.getAttribute(TenantContext.ATTR_AUTH_ROLE)).thenReturn("STAFF");
        when(request.getAttribute(TenantContext.ATTR_AUTH_TENANT_ID)).thenReturn(tokenTenantId.toString());

        filter.doFilter(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    void allowsSuperAdminAcrossTenants() throws Exception {
        UUID requestedTenantId = UUID.randomUUID();
        when(request.getRequestURI()).thenReturn("/api/v1/restaurants/" + requestedTenantId + "/categories");
        when(request.getParameter("tenantId")).thenReturn(null);
        when(request.getAttribute(TenantContext.ATTR_AUTH_ROLE)).thenReturn("SUPER_ADMIN");
        when(request.getAttribute(TenantContext.ATTR_AUTH_TENANT_ID)).thenReturn(null);

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }
}
