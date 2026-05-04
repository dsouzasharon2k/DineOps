package com.platterops.auth;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.platterops.user.UserService;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserService userService;

    public JwtAuthFilter(JwtUtils jwtUtils, UserService userService) {
        this.jwtUtils = jwtUtils;
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateAccessToken(token)) {
                Claims claims = jwtUtils.parseToken(token);
                String email = claims.getSubject();
                int tokenVersion = claims.get("tokenVersion", Integer.class) == null
                    ? 0
                    : claims.get("tokenVersion", Integer.class);
                var userOpt = userService.findByEmail(email);
                if (userOpt.isEmpty() || !userOpt.get().isActive()) {
                    filterChain.doFilter(request, response);
                    return;
                }
                int currentTokenVersion = userOpt.get().getTokenVersion() == null
                    ? 0
                    : userOpt.get().getTokenVersion();
                if (tokenVersion != currentTokenVersion) {
                    filterChain.doFilter(request, response);
                    return;
                }
                String role = claims.get("role", String.class);
                var auth = new UsernamePasswordAuthenticationToken(
                    email,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
                Object userId = claims.get("userId");
                Object tenantId = claims.get("tenantId");
                if (userId != null) {
                    MDC.put("userId", userId.toString());
                }
                if (tenantId != null) {
                    MDC.put("tenantId", tenantId.toString());
                }
                request.setAttribute(TenantContext.ATTR_AUTH_ROLE, role);
                if (tenantId != null) {
                    request.setAttribute(TenantContext.ATTR_AUTH_TENANT_ID, tenantId.toString());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}