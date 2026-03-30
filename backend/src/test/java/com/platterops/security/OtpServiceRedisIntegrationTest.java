package com.platterops.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=",
        "app.jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef"
})
@ActiveProfiles("test")
@SuppressWarnings("resource")
public class OtpServiceRedisIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7.0.11").withExposedPorts(6379);

    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private OtpService otpService;

    @Test
    void generateAndVerifyOtpWithRedis() {
        String phone = "+15550001234";
        String otp = otpService.generateOtp(phone);
        assertNotNull(otp);
        // ensure Redis has stored value and verification succeeds
        assertTrue(otpService.verifyOtp(phone, otp));
    }
}
