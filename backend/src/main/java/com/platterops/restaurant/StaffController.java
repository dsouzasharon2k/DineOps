package com.platterops.restaurant;

import com.platterops.auth.RegisterUserRequest;
import com.platterops.dto.UserResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.user.User;
import com.platterops.user.UserRole;
import com.platterops.user.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/staff")
public class StaffController {

    private static final Logger log = LoggerFactory.getLogger(StaffController.class);
    private final UserService userService;
    private final RestaurantRepository restaurantRepository;

    public StaffController(UserService userService, RestaurantRepository restaurantRepository) {
        this.userService = userService;
        this.restaurantRepository = restaurantRepository;
    }

    @PostMapping
    public ResponseEntity<UserResponse> inviteStaff(
            @PathVariable @NonNull UUID tenantId,
            @RequestBody @Valid RegisterUserRequest request) {

        if (userService.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        User user = new User();
        user.setTenant(tenant);
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setRole(UserRole.STAFF);
        user.setActive(true);

        User saved = userService.createUser(user, request.password());
        log.info("staff_invited userId={} tenantId={}", saved.getId(), tenantId);
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
}
