package com.platterops.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.core.env.Environment;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService implements InitializingBean {
    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final Duration OTP_EXPIRY = Duration.ofMinutes(5);

    private final ConcurrentHashMap<String, OtpData> otpStorage = new ConcurrentHashMap<>();

    private final SecureRandom secureRandom = new SecureRandom();

    private final StringRedisTemplate redisTemplate;
    private final Environment environment;

    public OtpService(@Nullable StringRedisTemplate redisTemplate, Environment environment) {
        this.redisTemplate = redisTemplate;
        this.environment = environment;
    }

    @Override
    public void afterPropertiesSet() {
        boolean isProdProfile = java.util.Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile));
        if (isProdProfile && redisTemplate == null) {
            throw new IllegalStateException("OTP requires Redis in prod profile.");
        }
    }

    public String generateOtp(String phone) {
        String otp = String.format("%06d", Math.abs(secureRandom.nextInt() % 1_000_000));
        if (redisTemplate != null) {
            String key = redisKey(phone);
            redisTemplate.opsForValue().set(key, otp, OTP_EXPIRY);
            log.info("OTP generated for phone {} (stored in Redis)", phone);
        } else {
            otpStorage.put(phone, new OtpData(otp, System.currentTimeMillis() + OTP_EXPIRY.toMillis()));
            log.info("OTP generated for phone {} (stored in-memory)", phone);
        }
        return otp;
    }

    public boolean verifyOtp(String phone, String otp) {
        if (redisTemplate != null) {
            String key = redisKey(phone);
            String stored = redisTemplate.opsForValue().get(key);
            if (stored == null) return false;
            boolean isValid = Objects.equals(stored, otp);
            if (isValid) {
                redisTemplate.delete(key);
            }
            return isValid;
        } else {
            OtpData data = otpStorage.get(phone);
            if (data == null) return false;
            if (System.currentTimeMillis() > data.expiry()) {
                otpStorage.remove(phone);
                return false;
            }
            boolean isValid = data.otp().equals(otp);
            if (isValid) otpStorage.remove(phone);
            return isValid;
        }
    }

    private static String redisKey(String phone) {
        return "otp:phone:"
                + phone;
    }

    private record OtpData(String otp, long expiry) {}
}
