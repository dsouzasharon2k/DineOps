package com.platterops.auth;

import jakarta.validation.Valid;
import com.platterops.dto.UserResponse;
import com.platterops.security.AccountLockoutService;
import com.platterops.security.RateLimitService;
import com.platterops.user.User;
import com.platterops.user.UserRole;
import com.platterops.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.time.Duration;
import java.util.Objects;
import java.util.UUID;

// import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final int LOGIN_RATE_LIMIT = 10;
    private static final int REGISTER_RATE_LIMIT = 5;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);
    private static final Duration REFRESH_COOKIE_TTL = Duration.ofDays(7);
    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private final UserService userService;
    private final JwtUtils jwtUtils;
    private final RateLimitService rateLimitService;
    private final AccountLockoutService accountLockoutService;
    private final com.platterops.security.OtpService otpService;
    private final com.platterops.security.TwoFactorService twoFactorService;

    public AuthController(UserService userService,
                          JwtUtils jwtUtils,
                          RateLimitService rateLimitService,
                          AccountLockoutService accountLockoutService,
                          com.platterops.security.OtpService otpService,
                          com.platterops.security.TwoFactorService twoFactorService) {
        this.userService = userService;
        this.jwtUtils = jwtUtils;
        this.rateLimitService = rateLimitService;
        this.accountLockoutService = accountLockoutService;
        this.otpService = otpService;
        this.twoFactorService = twoFactorService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid LoginRequest request) {
        if (!rateLimitService.isAllowed(loginRateLimitKey(request.email()), LOGIN_RATE_LIMIT, RATE_LIMIT_WINDOW)) {
            log.warn("rate_limited endpoint=login email={}", request.email());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many login attempts. Please try again later."));
        }

        if (accountLockoutService.isLocked(request.email())) {
            log.warn("login_blocked reason=account_locked email={}", request.email());
            return ResponseEntity.status(HttpStatus.LOCKED)
                    .body(Map.of("error", "Account temporarily locked due to repeated failed attempts."));
        }

        // Step 1: Look up the user by email in the database
        Optional<User> userOpt = userService.findByEmail(request.email());

        // Step 2: If no user found, return 401 immediately
        // We say "Invalid credentials" instead of "User not found"
        // so attackers can't tell whether the email exists or not
        if (userOpt.isEmpty()) {
            accountLockoutService.recordFailedAttempt(request.email());
            log.info("login_failed reason=user_not_found email={}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        User user = userOpt.get();

        // Step 3: Reject inactive users with the same generic 401 response
        // to avoid leaking account state details.
        if (!user.isActive()) {
            accountLockoutService.recordFailedAttempt(request.email());
            log.info("login_failed reason=inactive_user email={}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        // Step 4: Check if the provided password matches the stored BCrypt hash
        if (!userService.checkPassword(request.password(), user.getPasswordHash())) {
            accountLockoutService.recordFailedAttempt(request.email());
            log.info("login_failed reason=invalid_password email={}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        // Step 5: Check if 2FA is required
        if (user.isTwoFactorEnabled()) {
            log.info("login_requires_2fa userId={} email={}", user.getId(), user.getEmail());
            // Create a short-lived temporary token for 2FA verification
            // This is NOT the final access token
            String tempToken = jwtUtils.generateAccessToken(user.getId(), user.getEmail(), "2FA_PENDING", null);
            return ResponseEntity.ok(Map.of(
                    "requires2fa", true,
                    "tempToken", tempToken
            ));
        }

        // Step 6: Generate a JWT token containing userId, email, role, and tenantId
        // This token is returned to the client and used for all future requests
        String token = jwtUtils.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getEmail());
        log.info("login_success userId={} role={} tenantId={}",
                user.getId(),
                user.getRole(),
                user.getTenant() != null ? user.getTenant().getId() : null);
        accountLockoutService.clearFailures(request.email());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString())
                .body(Map.of("token", token));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshTokenCookie) {
        if (refreshTokenCookie == null || !jwtUtils.validateRefreshToken(refreshTokenCookie)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid refresh token"));
        }

        var claims = jwtUtils.parseToken(refreshTokenCookie);
        String email = claims.getSubject();
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid refresh token"));
        }

        User user = userOpt.get();
        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid refresh token"));
        }

        String accessToken = jwtUtils.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getEmail());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString())
                .body(Map.of("token", accessToken));
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2fa(@RequestBody Map<String, Object> request, 
                                      @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing temp token"));
        }
        String tempToken = authHeader.substring(7);
        if (!jwtUtils.validateAccessToken(tempToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired temp token"));
        }

        var claims = jwtUtils.parseToken(tempToken);
        if (!"2FA_PENDING".equals(claims.get("role"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token purpose"));
        }

        String email = claims.getSubject();
        User user = userService.findByEmail(email).orElseThrow();
        
        int code = (int) request.get("code");
        if (!twoFactorService.verifyCode(user.getTwoFactorSecret(), code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid 2FA code"));
        }

        String token = jwtUtils.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getEmail());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString())
                .body(Map.of("token", token));
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<?> setup2fa(@RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        // Only allow authenticated users to setup 2FA
        User user = getCurrentUser(authHeader);
        String secret = twoFactorService.generateSecret();
        String qrCodeUrl = twoFactorService.getQrCodeUrl(user.getEmail(), "DineOps", secret);
        
        return ResponseEntity.ok(Map.of(
                "secret", secret,
                "qrCodeUrl", qrCodeUrl
        ));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<?> enable2fa(@RequestBody Map<String, Object> request, 
                                      @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        User user = getCurrentUser(authHeader);
        String secret = (String) request.get("secret");
        int code = (int) request.get("code");

        if (twoFactorService.verifyCode(secret, code)) {
            user.setTwoFactorSecret(secret);
            user.setTwoFactorEnabled(true);
            userService.updateUser(user); // Need to add this method or use save
            return ResponseEntity.ok(Map.of("message", "2FA enabled successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid 2FA code"));
        }
    }

    private User getCurrentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }
        String token = authHeader.substring(7);
        var claims = jwtUtils.parseToken(token);
        String email = claims.getSubject();
        return userService.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number is required"));
        }
        otpService.generateOtp(phone);
        // In a real app, don't return the OTP in the response!
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/otp/login")
    public ResponseEntity<?> otpLogin(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        String otp = request.get("otp");

        if (phone == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and OTP are required"));
        }

        if (!otpService.verifyOtp(phone, otp)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired OTP"));
        }

        Optional<User> userOpt = userService.findByPhone(phone);
        User user;
        if (userOpt.isEmpty()) {
            // Auto-register customer if they don't exist
            user = new User();
            user.setPhone(phone);
            user.setName("Customer " + phone.substring(Math.max(0, phone.length() - 4)));
            user.setRole(UserRole.CUSTOMER);
            user.setActive(true);
            user = userService.createUser(user, UUID.randomUUID().toString()); // Random password for OTP users
        } else {
            user = userOpt.get();
        }

        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Account is inactive"));
        }

        String token = jwtUtils.generateAccessToken(
                user.getId(),
                user.getEmail() != null ? user.getEmail() : user.getPhone(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );
        String refreshToken = jwtUtils.generateRefreshToken(user.getId(), user.getEmail() != null ? user.getEmail() : user.getPhone());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString())
                .body(Map.of("token", token, "user", toUserResponse(user)));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String identifier = request.get("identifier"); // email or phone
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Identifier is required"));
        }

        Optional<User> userOpt = userService.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userService.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            // Generic message for security
            return ResponseEntity.ok(Map.of("message", "If an account exists, an OTP has been sent."));
        }

        User user = userOpt.get();
        otpService.generateOtp(user.getPhone() != null ? user.getPhone() : user.getEmail());
        
        return ResponseEntity.ok(Map.of("message", "If an account exists, an OTP has been sent."));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String identifier = request.get("identifier");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (identifier == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Identifier, OTP, and new password are required"));
        }

        Optional<User> userOpt = userService.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userService.findByPhone(identifier);
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid identifier"));
        }

        User user = userOpt.get();
        String phoneOrEmail = user.getPhone() != null ? user.getPhone() : user.getEmail();

        if (!otpService.verifyOtp(phoneOrEmail, otp)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired OTP"));
        }

        userService.updatePassword(user, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@RequestBody @Valid RegisterUserRequest request) {
        if (!rateLimitService.isAllowed(registerRateLimitKey(request.email()), REGISTER_RATE_LIMIT, RATE_LIMIT_WINDOW)) {
            log.warn("rate_limited endpoint=register email={}", request.email());
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many registration attempts. Please try again later.");
        }

        if (userService.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setRole(UserRole.CUSTOMER);
        user.setActive(true);

        User saved = userService.createUser(user, request.password());
        log.info("user_registered userId={} role={}", saved.getId(), saved.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(toUserResponse(saved));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getTenant() != null ? user.getTenant().getId() : null,
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private String loginRateLimitKey(String email) {
        return "rate_limit:auth:login:" + email.trim().toLowerCase();
    }

    private String registerRateLimitKey(String email) {
        return "rate_limit:auth:register:" + email.trim().toLowerCase();
    }

    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(Objects.requireNonNull(REFRESH_COOKIE_TTL))
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();
    }

    // @GetMapping("/hash")
    // public ResponseEntity<?> generateHash(@RequestParam String password) {
    //     BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    //     return ResponseEntity.ok(Map.of("hash", encoder.encode(password)));
    // }
}