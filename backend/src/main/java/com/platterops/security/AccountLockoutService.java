package com.dineops.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;
import java.util.Objects;

@Service
@SuppressWarnings("null")
public class AccountLockoutService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final StringRedisTemplate redisTemplate;

    public AccountLockoutService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isLocked(String email) {
        String key = lockKey(Objects.requireNonNull(email, "email must not be null"));
        Boolean exists = redisTemplate.hasKey(key);
        return Boolean.TRUE.equals(exists);
    }

    public void recordFailedAttempt(String email) {
        String safeEmail = Objects.requireNonNull(email, "email must not be null");
        String failedKey = failedAttemptsKey(safeEmail);
        Long attempts = redisTemplate.opsForValue().increment(failedKey);
        if (attempts == null) {
            return;
        }

        if (attempts == 1) {
            redisTemplate.expire(failedKey, Objects.requireNonNull(LOCK_DURATION));
        }

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            redisTemplate.opsForValue().set(lockKey(safeEmail), "1", Objects.requireNonNull(LOCK_DURATION));
            redisTemplate.delete(failedKey);
        }
    }

    public void clearFailures(String email) {
        String safeEmail = Objects.requireNonNull(email, "email must not be null");
        redisTemplate.delete(failedAttemptsKey(safeEmail));
        redisTemplate.delete(lockKey(safeEmail));
    }

    private String failedAttemptsKey(String email) {
        return "auth:failed:" + normalizeEmail(email);
    }

    private String lockKey(String email) {
        return "auth:lock:" + normalizeEmail(email);
    }

    private String normalizeEmail(String email) {
        return Objects.requireNonNull(email.trim().toLowerCase(Locale.ROOT));
    }
}
