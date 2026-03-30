package com.platterops.auth;

import com.platterops.security.AccountLockoutService;
import com.platterops.security.RateLimitService;
import com.platterops.user.User;
import com.platterops.user.UserRole;
import com.platterops.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.web.server.ResponseStatusException;

class AuthControllerTest {

    private UserService userService;
    private JwtUtils jwtUtils;
    private RateLimitService rateLimitService;
    private AccountLockoutService accountLockoutService;
    private com.platterops.security.OtpService otpService;
    private com.platterops.security.TwoFactorService twoFactorService;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        userService = Mockito.mock(UserService.class);
        jwtUtils = Mockito.mock(JwtUtils.class);
        rateLimitService = Mockito.mock(RateLimitService.class);
        accountLockoutService = Mockito.mock(AccountLockoutService.class);
        otpService = Mockito.mock(com.platterops.security.OtpService.class);
        twoFactorService = Mockito.mock(com.platterops.security.TwoFactorService.class);
        when(rateLimitService.isAllowed(Mockito.anyString(), Mockito.anyInt(), Mockito.any(Duration.class))).thenReturn(true);
        when(accountLockoutService.isLocked(Mockito.anyString())).thenReturn(false);
        authController = new AuthController(userService, jwtUtils, rateLimitService, accountLockoutService, otpService, twoFactorService);
    }

    @Test
    void login_activeUser_returnsToken() {
        User activeUser = buildUser(true);
        when(userService.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(userService.checkPassword("plainPassword123", activeUser.getPasswordHash())).thenReturn(true);
        when(jwtUtils.generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class)))
                .thenReturn("jwt-token");
        when(jwtUtils.generateRefreshToken(nullable(UUID.class), anyString()))
                .thenReturn("refresh-token");

        ResponseEntity<?> response = authController.login(
                new LoginRequest(activeUser.getEmail(), "plainPassword123"));

        assertEquals(200, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("jwt-token", body.get("token"));
        verify(accountLockoutService).clearFailures(activeUser.getEmail());
    }

    @Test
    void login_inactiveUser_returnsGenericUnauthorizedAndNoTokenIssued() {
        User inactiveUser = buildUser(false);
        when(userService.findByEmail(inactiveUser.getEmail())).thenReturn(Optional.of(inactiveUser));

        ResponseEntity<?> response = authController.login(
                new LoginRequest(inactiveUser.getEmail(), "plainPassword123"));

        assertEquals(401, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Invalid credentials", body.get("error"));

        verify(accountLockoutService).recordFailedAttempt(inactiveUser.getEmail());
        verify(userService, never()).checkPassword(anyString(), anyString());
        verify(jwtUtils, never()).generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class));
    }

    @Test
    void login_wrongPassword_returnsUnauthorized() {
        User activeUser = buildUser(true);
        when(userService.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(userService.checkPassword("wrong", activeUser.getPasswordHash())).thenReturn(false);

        ResponseEntity<?> response = authController.login(new LoginRequest(activeUser.getEmail(), "wrong"));

        assertEquals(401, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertTrue(body.containsKey("error"));
        assertEquals("Invalid credentials", body.get("error"));
        verify(accountLockoutService).recordFailedAttempt(activeUser.getEmail());
        verify(jwtUtils, never()).generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class));
    }

    @Test
    void register_duplicateEmail_returnsConflict() {
        User existing = buildUser(true);
        when(userService.findByEmail(existing.getEmail())).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> authController.register(new RegisterUserRequest(
                        "Customer One",
                        existing.getEmail(),
                        "PasswordA1",
                        "9999999999")));

        assertEquals(409, ex.getStatusCode().value());
        verify(userService, never()).createUser(org.mockito.ArgumentMatchers.any(User.class), anyString());
    }

    @Test
    void register_newCustomer_returnsCreatedUserResponse() {
        when(userService.findByEmail("new@dineops.com")).thenReturn(Optional.empty());
        User saved = buildUser(true);
        saved.setName("New Customer");
        saved.setEmail("new@dineops.com");
        saved.setRole(UserRole.CUSTOMER);
        when(userService.createUser(org.mockito.ArgumentMatchers.any(User.class), anyString())).thenReturn(saved);

        ResponseEntity<?> response = authController.register(new RegisterUserRequest(
                "New Customer",
                "new@dineops.com",
                "PasswordA1",
                "9999999999"));

        assertEquals(201, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void login_rateLimited_returnsTooManyRequests() {
        when(rateLimitService.isAllowed(Mockito.anyString(), Mockito.anyInt(), Mockito.any(Duration.class)))
                .thenReturn(false);

        ResponseEntity<?> response = authController.login(new LoginRequest("test@dineops.com", "wrong"));

        assertEquals(429, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Too many login attempts. Please try again later.", body.get("error"));
        verify(userService, never()).findByEmail(anyString());
        verify(jwtUtils, never()).generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class));
    }

    @Test
    void login_lockedAccount_returnsLocked() {
        when(accountLockoutService.isLocked("test@dineops.com")).thenReturn(true);

        ResponseEntity<?> response = authController.login(new LoginRequest("test@dineops.com", "wrong"));

        assertEquals(423, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Account temporarily locked due to repeated failed attempts.", body.get("error"));
        verify(userService, never()).findByEmail(anyString());
        verify(jwtUtils, never()).generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class));
    }

    @Test
    void refresh_validRefreshToken_returnsNewAccessAndRefreshToken() {
        User activeUser = buildUser(true);
        activeUser.setEmail("refresh@dineops.com");
        when(jwtUtils.validateRefreshToken("valid-refresh")).thenReturn(true);
        io.jsonwebtoken.Claims claims = Mockito.mock(io.jsonwebtoken.Claims.class);
        when(claims.getSubject()).thenReturn("refresh@dineops.com");
        when(jwtUtils.parseToken("valid-refresh")).thenReturn(claims);
        when(userService.findByEmail("refresh@dineops.com")).thenReturn(Optional.of(activeUser));
        when(jwtUtils.generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class)))
                .thenReturn("new-access");
        when(jwtUtils.generateRefreshToken(nullable(UUID.class), anyString()))
                .thenReturn("new-refresh");

        ResponseEntity<?> response = authController.refresh("valid-refresh");

        assertEquals(200, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("new-access", body.get("token"));
    }

    @Test
    void refresh_invalidRefreshToken_returnsUnauthorized() {
        when(jwtUtils.validateRefreshToken("invalid-refresh")).thenReturn(false);

        ResponseEntity<?> response = authController.refresh("invalid-refresh");

        assertEquals(401, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Invalid refresh token", body.get("error"));
        verify(userService, never()).findByEmail(anyString());
    }

    @Test
    void refresh_missingCookie_returnsUnauthorized() {
        ResponseEntity<?> response = authController.refresh(null);

        assertEquals(401, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("Invalid refresh token", body.get("error"));
    }

    private User buildUser(boolean active) {
        User user = new User();
        user.setEmail("test@dineops.com");
        user.setPasswordHash("$2a$10$fakehashforunit.test.sample");
        user.setRole(UserRole.STAFF);
        user.setActive(active);
        return user;
    }
}
