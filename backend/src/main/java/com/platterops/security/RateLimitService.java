package com.platterops.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Objects;

@Service
public class RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitService.class);

    private final StringRedisTemplate redisTemplate;

    public RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isAllowed(String key, int maxAttempts, Duration window) {
        try {
            String safeKey = Objects.requireNonNull(key, "key must not be null");
            Duration safeWindow = Objects.requireNonNull(window, "window must not be null");
            Long current = redisTemplate.opsForValue().increment(safeKey);
            if (current == null) {
                return true;
            }
            if (current == 1) {
                redisTemplate.expire(safeKey, safeWindow);
            }
            return current <= maxAttempts;
        } catch (Exception ex) {
            // Fail open if Redis is unavailable so auth does not go down hard.
            log.warn("Rate limiter unavailable for key={}", key, ex);
            return true;
        }
    }
}
