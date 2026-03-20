package com.dineops.auth;

import jakarta.validation.Valid;
import com.dineops.dto.UserResponse;
import com.dineops.security.RateLimitService;
import com.dineops.user.User;
import com.dineops.user.UserRole;
import com.dineops.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.time.Duration;

// import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final int LOGIN_RATE_LIMIT = 10;
    private static final int REGISTER_RATE_LIMIT = 5;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);
    private final UserService userService;
    private final JwtUtils jwtUtils;
    private final RateLimitService rateLimitService;

    public AuthController(UserService userService, JwtUtils jwtUtils, RateLimitService rateLimitService) {
        this.userService = userService;
        this.jwtUtils = jwtUtils;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid LoginRequest request) {
        if (!rateLimitService.isAllowed(loginRateLimitKey(request.email()), LOGIN_RATE_LIMIT, RATE_LIMIT_WINDOW)) {
            log.warn("rate_limited endpoint=login email={}", request.email());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many login attempts. Please try again later."));
        }

        // Step 1: Look up the user by email in the database
        Optional<User> userOpt = userService.findByEmail(request.email());

        // Step 2: If no user found, return 401 immediately
        // We say "Invalid credentials" instead of "User not found"
        // so attackers can't tell whether the email exists or not
        if (userOpt.isEmpty()) {
            log.info("login_failed reason=user_not_found email={}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        User user = userOpt.get();

        // Step 3: Reject inactive users with the same generic 401 response
        // to avoid leaking account state details.
        if (!user.isActive()) {
            log.info("login_failed reason=inactive_user email={}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        // Step 4: Check if the provided password matches the stored BCrypt hash
        if (!userService.checkPassword(request.password(), user.getPasswordHash())) {
            log.info("login_failed reason=invalid_password email={}", request.email());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        // Step 5: Generate a JWT token containing userId, email, role, and tenantId
        // This token is returned to the client and used for all future requests
        String token = jwtUtils.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );
        log.info("login_success userId={} role={} tenantId={}",
                user.getId(),
                user.getRole(),
                user.getTenant() != null ? user.getTenant().getId() : null);

        return ResponseEntity.ok(Map.of("token", token));
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

    // @GetMapping("/hash")
    // public ResponseEntity<?> generateHash(@RequestParam String password) {
    //     BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    //     return ResponseEntity.ok(Map.of("hash", encoder.encode(password)));
    // }
}