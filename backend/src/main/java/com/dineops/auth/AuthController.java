package com.dineops.auth;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.dineops.user.User;
import com.dineops.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

// import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;
    private final JwtUtils jwtUtils;

    public AuthController(UserService userService, JwtUtils jwtUtils) {
        this.userService = userService;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Step 1: Look up the user by email in the database
        Optional<User> userOpt = userService.findByEmail(request.email());

        // Step 2: If no user found, return 401 immediately
        // We say "Invalid credentials" instead of "User not found"
        // so attackers can't tell whether the email exists or not
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        User user = userOpt.get();

        // Step 3: Check if the provided password matches the stored BCrypt hash
        if (!userService.checkPassword(request.password(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        // Step 4: Generate a JWT token containing userId, email, role, and tenantId
        // This token is returned to the client and used for all future requests
        String token = jwtUtils.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );

        return ResponseEntity.ok(Map.of("token", token));
    }

    // @GetMapping("/hash")
    // public ResponseEntity<?> generateHash(@RequestParam String password) {
    //     BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    //     return ResponseEntity.ok(Map.of("hash", encoder.encode(password)));
    // }
}