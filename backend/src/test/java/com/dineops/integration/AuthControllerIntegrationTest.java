package com.dineops.integration;

import com.dineops.auth.JwtUtils;
import com.dineops.security.AccountLockoutService;
import com.dineops.security.RateLimitService;
import com.dineops.user.User;
import com.dineops.user.UserRole;
import com.dineops.user.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private RateLimitService rateLimitService;

    @MockBean
    private AccountLockoutService accountLockoutService;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @Test
    void login_success_returnsTokenAndSetsRefreshCookie() throws Exception {
        User user = new User();
        user.setEmail("staff@dineops.com");
        user.setPasswordHash("hashed-password");
        user.setRole(UserRole.STAFF);
        user.setActive(true);

        when(rateLimitService.isAllowed(anyString(), anyInt(), any(Duration.class))).thenReturn(true);
        when(accountLockoutService.isLocked(anyString())).thenReturn(false);
        when(userService.findByEmail("staff@dineops.com")).thenReturn(Optional.of(user));
        when(userService.checkPassword("PasswordA1", "hashed-password")).thenReturn(true);
        when(jwtUtils.generateAccessToken(nullable(UUID.class), anyString(), anyString(), nullable(UUID.class)))
                .thenReturn("access-token");
        when(jwtUtils.generateRefreshToken(nullable(UUID.class), anyString()))
                .thenReturn("refresh-token");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "staff@dineops.com",
                                  "password": "PasswordA1"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access-token"))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }
}
