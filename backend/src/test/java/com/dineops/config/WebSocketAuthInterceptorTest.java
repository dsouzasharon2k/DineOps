package com.dineops.config;

import com.dineops.auth.JwtUtils;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.MessageDeliveryException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebSocketAuthInterceptorTest {

    private JwtUtils jwtUtils;
    private WebSocketAuthInterceptor interceptor;

    @BeforeEach
    void setUp() {
        jwtUtils = mock(JwtUtils.class);
        interceptor = new WebSocketAuthInterceptor(jwtUtils);
    }

    @Test
    void preSend_connectWithValidToken_setsPrincipal() {
        UUID userId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        String token = "valid-token";
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("user@test.com");
        when(claims.get("userId", String.class)).thenReturn(userId.toString());
        when(claims.get("role", String.class)).thenReturn("TENANT_ADMIN");
        when(claims.get("tenantId", String.class)).thenReturn(tenantId.toString());

        when(jwtUtils.validateAccessToken(token)).thenReturn(true);
        when(jwtUtils.parseToken(token)).thenReturn(claims);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        Message<?> result = interceptor.preSend(message, mock(MessageChannel.class));

        assertNotNull(result);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertNotNull(resultAccessor.getUser());
        assertEquals("user@test.com", resultAccessor.getUser().getName());
        assertEquals(tenantId, ((WebSocketAuthInterceptor.StompPrincipal) resultAccessor.getUser()).tenantId());
    }

    @Test
    void preSend_connectWithoutAuthHeader_throws() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));

        assertEquals("Authentication required", ex.getMessage());
    }

    @Test
    void preSend_connectWithInvalidToken_throws() {
        when(jwtUtils.validateAccessToken(anyString())).thenReturn(false);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer invalid");
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));

        assertEquals("Invalid or expired token", ex.getMessage());
    }

    @Test
    void preSend_subscribeWithMatchingTenant_allows() {
        UUID tenantId = UUID.randomUUID();
        WebSocketAuthInterceptor.StompPrincipal principal =
                new WebSocketAuthInterceptor.StompPrincipal("user@test.com", UUID.randomUUID(), "TENANT_ADMIN", tenantId);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(principal);
        accessor.setDestination("/topic/orders/" + tenantId);
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        Message<?> result = interceptor.preSend(message, mock(MessageChannel.class));

        assertNotNull(result);
    }

    @Test
    void preSend_subscribeSuperAdmin_canAccessAnyTenant() {
        WebSocketAuthInterceptor.StompPrincipal principal =
                new WebSocketAuthInterceptor.StompPrincipal("admin@test.com", UUID.randomUUID(), "SUPER_ADMIN", null);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(principal);
        accessor.setDestination("/topic/orders/" + UUID.randomUUID());
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        Message<?> result = interceptor.preSend(message, mock(MessageChannel.class));

        assertNotNull(result);
    }

    @Test
    void preSend_subscribeCrossTenant_throws() {
        UUID tenantId = UUID.randomUUID();
        UUID otherTenantId = UUID.randomUUID();
        WebSocketAuthInterceptor.StompPrincipal principal =
                new WebSocketAuthInterceptor.StompPrincipal("user@test.com", UUID.randomUUID(), "TENANT_ADMIN", tenantId);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(principal);
        accessor.setDestination("/topic/orders/" + otherTenantId);
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));

        assertEquals("Access denied to tenant", ex.getMessage());
    }

    @Test
    void preSend_subscribeOrderTopic_allowsAuthenticatedUser() {
        WebSocketAuthInterceptor.StompPrincipal principal =
                new WebSocketAuthInterceptor.StompPrincipal("user@test.com", UUID.randomUUID(), "STAFF", UUID.randomUUID());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(principal);
        accessor.setDestination("/topic/order/" + UUID.randomUUID());
        Message<?> message = MessageBuilder.withPayload(new byte[0])
                .copyHeaders(accessor.getMessageHeaders())
                .build();

        Message<?> result = interceptor.preSend(message, mock(MessageChannel.class));

        assertNotNull(result);
    }

    @Test
    void stompPrincipal_getName_returnsEmail() {
        WebSocketAuthInterceptor.StompPrincipal principal =
                new WebSocketAuthInterceptor.StompPrincipal("test@example.com", UUID.randomUUID(), "STAFF", UUID.randomUUID());

        assertEquals("test@example.com", principal.getName());
    }
}
