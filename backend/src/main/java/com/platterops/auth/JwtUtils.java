package com.platterops.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import jakarta.annotation.PostConstruct;

@Component
public class JwtUtils {
    private static final int MIN_JWT_SECRET_BYTES = 32;
    private static final String TOKEN_TYPE_CLAIM = "tokenType";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms:${app.jwt.expiration-ms}}")
    private long refreshExpirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    @PostConstruct
    private void validate() {
        if (jwtSecret == null || jwtSecret.isBlank() || jwtSecret.contains("replace-with")
                || jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_JWT_SECRET_BYTES) {
            throw new IllegalStateException("JWT secret is not configured. Set the JWT_SECRET env var (32+ bytes). Startup halted.");
        }
    }

    public String generateAccessToken(UUID userId, String email, String role, UUID tenantId) {
        return generateAccessToken(userId, email, role, tenantId, 0);
    }

    public String generateAccessToken(UUID userId, String email, String role, UUID tenantId, int tokenVersion) {
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId.toString())
                .claim("role", role)
                .claim("tenantId", tenantId != null ? tenantId.toString() : null)
                .claim("tokenVersion", tokenVersion)
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(UUID userId, String email) {
        return generateRefreshToken(userId, email, 0);
    }

    public String generateRefreshToken(UUID userId, String email, int tokenVersion) {
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId.toString())
                .claim("tokenVersion", tokenVersion)
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    // Backward-compatible alias.
    public String generateToken(UUID userId, String email, String role, UUID tenantId) {
        return generateAccessToken(userId, email, role, tenantId);
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateAccessToken(String token) {
        try {
            Claims claims = parseToken(token);
            return ACCESS_TOKEN_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateRefreshToken(String token) {
        try {
            Claims claims = parseToken(token);
            return REFRESH_TOKEN_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}