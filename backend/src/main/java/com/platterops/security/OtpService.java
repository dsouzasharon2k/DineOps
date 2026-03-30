package com.platterops.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Random;

@Service
public class OtpService {
    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final Duration OTP_EXPIRY = Duration.ofMinutes(5);
    private final ConcurrentHashMap<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public String generateOtp(String phone) {
        // In a real app, this would send an SMS
        String otp = String.format("%06d", random.nextInt(1000000));
        otpStorage.put(phone, new OtpData(otp, System.currentTimeMillis() + OTP_EXPIRY.toMillis()));
        log.info("OTP generated for phone {}: {}", phone, otp);
        return otp;
    }

    public boolean verifyOtp(String phone, String otp) {
        OtpData data = otpStorage.get(phone);
        if (data == null) return false;
        if (System.currentTimeMillis() > data.expiry()) {
            otpStorage.remove(phone);
            return false;
        }
        boolean isValid = data.otp().equals(otp);
        if (isValid) {
            otpStorage.remove(phone);
        }
        return isValid;
    }

    private record OtpData(String otp, long expiry) {}
}
