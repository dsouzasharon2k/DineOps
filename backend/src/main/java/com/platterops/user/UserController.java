package com.platterops.user;

import com.platterops.dto.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @DeleteMapping("/me")
    public ResponseEntity<UserResponse> deleteMyAccount(Authentication authentication) {
        User user = userService.deactivateAndAnonymizeByEmail(authentication.getName());
        return ResponseEntity.ok(toResponse(user));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<UserResponse> deactivateUser(@PathVariable UUID userId) {
        User user = userService.deactivateAndAnonymizeById(userId);
        return ResponseEntity.ok(toResponse(user));
    }

    private UserResponse toResponse(User user) {
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
}
