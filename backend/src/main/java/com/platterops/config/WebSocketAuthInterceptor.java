package com.dineops.config;

import com.dineops.auth.JwtUtils;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STOMP channel interceptor that authenticates WebSocket connections via JWT
 * and enforces tenant-scoped topic subscriptions.
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);
    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final Pattern TOPIC_ORDERS_TENANT = Pattern.compile("^/topic/orders/([a-fA-F0-9-]+)$");
    private static final Pattern TOPIC_ORDER_ID = Pattern.compile("^/topic/order/([a-fA-F0-9-]+)$");

    private final JwtUtils jwtUtils;

    public WebSocketAuthInterceptor(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            return handleConnect(accessor, message, channel);
        }
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return handleSubscribe(accessor, message, channel);
        }

        return message;
    }

    private Message<?> handleConnect(StompHeaderAccessor accessor, Message<?> message, MessageChannel channel) {
        String authHeader = accessor.getFirstNativeHeader(AUTH_HEADER);
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("WebSocket CONNECT rejected: missing or invalid Authorization header");
            throw new MessageDeliveryException("Authentication required");
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();
        if (!jwtUtils.validateAccessToken(token)) {
            log.warn("WebSocket CONNECT rejected: invalid or expired token");
            throw new MessageDeliveryException("Invalid or expired token");
        }

        try {
            Claims claims = jwtUtils.parseToken(token);
            String email = claims.getSubject();
            UUID userId = UUID.fromString(claims.get("userId", String.class));
            String role = claims.get("role", String.class);
            String tenantIdStr = claims.get("tenantId", String.class);
            UUID tenantId = tenantIdStr != null ? UUID.fromString(tenantIdStr) : null;

            StompPrincipal principal = new StompPrincipal(email, userId, role, tenantId);
            accessor.setUser(principal);
            accessor.setLeaveMutable(true);
            return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
        } catch (Exception e) {
            log.warn("WebSocket CONNECT rejected: failed to parse token claims", e);
            throw new MessageDeliveryException("Invalid token claims");
        }
    }

    private Message<?> handleSubscribe(StompHeaderAccessor accessor, Message<?> message, MessageChannel channel) {
        Principal user = accessor.getUser();
        if (user == null || !(user instanceof StompPrincipal principal)) {
            log.warn("WebSocket SUBSCRIBE rejected: no authenticated principal");
            throw new MessageDeliveryException("Authentication required");
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            return message;
        }

        // /topic/orders/{tenantId} — must match user's tenant (or SUPER_ADMIN)
        Matcher tenantMatcher = TOPIC_ORDERS_TENANT.matcher(destination);
        if (tenantMatcher.matches()) {
            UUID requestedTenantId = UUID.fromString(tenantMatcher.group(1));
            if ("SUPER_ADMIN".equals(principal.role())) {
                return message;
            }
            if (principal.tenantId() == null || !principal.tenantId().equals(requestedTenantId)) {
                log.warn("WebSocket SUBSCRIBE rejected: cross-tenant access to {} by user {}", destination, principal.name());
                throw new MessageDeliveryException("Access denied to tenant");
            }
            return message;
        }

        // /topic/order/{orderId} — allow for authenticated users (order access validated at publish time)
        Matcher orderMatcher = TOPIC_ORDER_ID.matcher(destination);
        if (orderMatcher.matches()) {
            return message;
        }

        return message;
    }

    /**
     * Principal holding JWT-derived user identity for WebSocket sessions.
     */
    public record StompPrincipal(String name, UUID userId, String role, UUID tenantId) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}
