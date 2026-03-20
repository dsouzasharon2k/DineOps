package com.dineops.auth;

import com.dineops.user.User;
import com.dineops.user.UserRole;
import com.dineops.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthControllerTest {

    private UserService userService;
    private JwtUtils jwtUtils;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        userService = Mockito.mock(UserService.class);
        jwtUtils = Mockito.mock(JwtUtils.class);
        authController = new AuthController(userService, jwtUtils);
    }

    @Test
    void login_activeUser_returnsToken() {
        User activeUser = buildUser(true);
        when(userService.findByEmail(activeUser.getEmail())).thenReturn(Optional.of(activeUser));
        when(userService.checkPassword("plainPassword123", activeUser.getPasswordHash())).thenReturn(true);
        when(jwtUtils.generateToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class)))
                .thenReturn("jwt-token");

        ResponseEntity<?> response = authController.login(
                new LoginRequest(activeUser.getEmail(), "plainPassword123"));

        assertEquals(200, response.getStatusCode().value());
        assertInstanceOf(Map.class, response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertNotNull(body);
        assertEquals("jwt-token", body.get("token"));
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

        verify(userService, never()).checkPassword(anyString(), anyString());
        verify(jwtUtils, never()).generateToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class));
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
        verify(jwtUtils, never()).generateToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class));
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
