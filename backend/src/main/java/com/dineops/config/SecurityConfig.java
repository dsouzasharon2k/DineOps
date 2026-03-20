package com.dineops.config;

import com.dineops.auth.JwtAuthFilter;
import com.dineops.auth.TenantAuthorizationFilter;
import com.dineops.logging.RequestContextFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final TenantAuthorizationFilter tenantAuthorizationFilter;
    private final RequestContextFilter requestContextFilter;
    private final List<String> allowedOrigins;
    private final List<String> allowedMethods;
    private final List<String> allowedHeaders;
    private final long maxAgeSeconds;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          TenantAuthorizationFilter tenantAuthorizationFilter,
                          RequestContextFilter requestContextFilter,
                          @Value("#{'${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}'.split(',')}") List<String> allowedOrigins,
                          @Value("#{'${app.cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS,PATCH}'.split(',')}") List<String> allowedMethods,
                          @Value("#{'${app.cors.allowed-headers:*}'.split(',')}") List<String> allowedHeaders,
                          @Value("${app.cors.max-age-seconds:3600}") long maxAgeSeconds) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.tenantAuthorizationFilter = tenantAuthorizationFilter;
        this.requestContextFilter = requestContextFilter;
        this.allowedOrigins = allowedOrigins.stream().map(String::trim).toList();
        this.allowedMethods = allowedMethods.stream().map(String::trim).toList();
        this.allowedHeaders = allowedHeaders.stream().map(String::trim).toList();
        this.maxAgeSeconds = maxAgeSeconds;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                .contentTypeOptions(Customizer.withDefaults())
                .frameOptions(frameOptions -> frameOptions.deny())
                .xssProtection(xss -> xss
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.DISABLED))
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true))
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'"))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").hasRole("SUPER_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/restaurants/**").permitAll()
                // Public order placement and status tracking (customers not logged in)
                .requestMatchers(HttpMethod.POST, "/api/v1/orders").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/orders/*/cancel").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/api/v1/orders", "/api/v1/orders/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/orders/{orderId}").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/restaurants/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/restaurants/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/restaurants/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/orders/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN", "STAFF")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/orders/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN", "STAFF")
                .anyRequest().authenticated()
            )
                    .addFilterBefore(requestContextFilter, UsernamePasswordAuthenticationFilter.class)
                    .addFilterAfter(jwtAuthFilter, RequestContextFilter.class)
                    .addFilterAfter(tenantAuthorizationFilter, JwtAuthFilter.class);
        return http.build()
        ;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(allowedMethods);
        config.setAllowedHeaders(allowedHeaders);
        config.setAllowCredentials(true);
        config.setMaxAge(maxAgeSeconds);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}