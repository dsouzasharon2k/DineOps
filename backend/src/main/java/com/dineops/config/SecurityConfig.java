package com.dineops.config;

import com.dineops.auth.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                // Public
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                // Restaurants
                .requestMatchers("GET", "/api/v1/restaurants").permitAll()
                .requestMatchers("POST", "/api/v1/restaurants").hasRole("SUPER_ADMIN")
                .requestMatchers("PUT", "/api/v1/restaurants/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                .requestMatchers("DELETE", "/api/v1/restaurants/**").hasRole("SUPER_ADMIN")
                // Menu categories - public GET, auth required for write operations
                .requestMatchers("GET", "/api/v1/restaurants/*/categories").permitAll()
                .requestMatchers("POST", "/api/v1/restaurants/*/categories").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                .requestMatchers("DELETE", "/api/v1/restaurants/*/categories/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                // Menu items - public GET, auth required for write operations
                .requestMatchers("GET", "/api/v1/restaurants/*/categories/*/items").permitAll()
                .requestMatchers("POST", "/api/v1/restaurants/*/categories/*/items").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                .requestMatchers("DELETE", "/api/v1/restaurants/*/categories/*/items/**").hasAnyRole("SUPER_ADMIN", "TENANT_ADMIN")
                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}