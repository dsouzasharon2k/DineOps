package com.platterops.restaurant;

import com.platterops.dto.PageResponse;
import com.platterops.dto.RestaurantResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<RestaurantResponse>> getAllRestaurants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(PageResponse.from(restaurantService.getRestaurantResponsePage(page, size)));
    }

    @GetMapping("/{restaurantId}")
    public ResponseEntity<RestaurantResponse> getRestaurantById(@PathVariable java.util.UUID restaurantId) {
        return ResponseEntity.ok(restaurantService.getRestaurantResponseById(restaurantId));
    }

    @PostMapping
    public ResponseEntity<RestaurantResponse> createRestaurant(
            @RequestBody @Valid CreateRestaurantRequest request,
            Authentication authentication) {
        boolean actorIsSuperAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_SUPER_ADMIN".equals(authority.getAuthority()));
        RestaurantResponse created = restaurantService.createRestaurantResponse(
                request,
                authentication.getName(),
                actorIsSuperAdmin
        );
        return ResponseEntity.status(201).body(created);
    }
}