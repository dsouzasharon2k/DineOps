package com.dineops.config;

import com.dineops.auth.JwtAuthFilter;
import com.dineops.logging.RequestContextFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.core.annotation.Order;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RequestContextFilter requestContextFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, RequestContextFilter requestContextFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.requestContextFilter = requestContextFilter;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/restaurants/**").permitAll()
                // Public order placement and status tracking (customers not logged in)
                .requestMatchers(HttpMethod.POST, "/api/v1/orders").permitAll()
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
                    .addFilterAfter(jwtAuthFilter, RequestContextFilter.class);
        return http.build()
        ;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}