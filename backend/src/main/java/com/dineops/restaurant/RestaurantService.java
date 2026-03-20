package com.dineops.restaurant;

import com.dineops.audit.AuditedAction;
import com.dineops.dto.RestaurantResponse;
import com.dineops.exception.EntityNotFoundException;
import com.dineops.review.ReviewService;
import com.dineops.user.User;
import com.dineops.user.UserRepository;
import com.dineops.user.UserRole;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;
    private final ReviewService reviewService;

    public RestaurantService(RestaurantRepository restaurantRepository, UserRepository userRepository, ReviewService reviewService) {
        this.restaurantRepository = restaurantRepository;
        this.userRepository = userRepository;
        this.reviewService = reviewService;
    }

    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    @Cacheable(cacheNames = "restaurants:all", key = "#page + ':' + #size")
    public Page<RestaurantResponse> getRestaurantResponsePage(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Restaurant> restaurantPage = restaurantRepository.findAll(pageable);
        List<RestaurantResponse> content = restaurantPage.getContent().stream()
                .map(this::toResponse)
                .toList();
        return new PageImpl<>(Objects.requireNonNull(content), pageable, restaurantPage.getTotalElements());
    }

    @Cacheable(cacheNames = "restaurants:by-id", key = "#restaurantId")
    public RestaurantResponse getRestaurantResponseById(java.util.UUID restaurantId) {
        java.util.UUID safeRestaurantId = java.util.Objects.requireNonNull(restaurantId, "restaurantId cannot be null");
        Restaurant restaurant = restaurantRepository.findById(safeRestaurantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        return toResponse(restaurant);
    }

    @AuditedAction(entityType = "RESTAURANT", action = "CREATE")
    public RestaurantResponse createRestaurantResponse(CreateRestaurantRequest request, String actorEmail, boolean actorIsSuperAdmin) {
        String slug = generateSlug(request.name());
        if (restaurantRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("Restaurant slug already exists. Please use a different name.");
        }

        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.name().trim());
        restaurant.setSlug(slug);
        restaurant.setAddress(trimToNull(request.address()));
        restaurant.setPhone(trimToNull(request.phone()));
        restaurant.setCuisineType(trimToNull(request.cuisineType()));
        restaurant.setLogoUrl(trimToNull(request.logoUrl()));
        restaurant.setFssaiLicense(trimToNull(request.fssaiLicense()));
        restaurant.setGstNumber(trimToNull(request.gstNumber()));
        restaurant.setOperatingHours(trimToNull(request.operatingHours()));
        restaurant.setDefaultPrepTimeMinutes(request.defaultPrepTimeMinutes() != null ? request.defaultPrepTimeMinutes() : 20);

        Restaurant savedRestaurant = restaurantRepository.save(restaurant);
        User owner = resolveOwner(actorEmail, request.ownerEmail(), actorIsSuperAdmin);
        owner.setTenant(savedRestaurant);
        owner.setRole(UserRole.TENANT_ADMIN);
        userRepository.save(owner);

        return toResponse(savedRestaurant);
    }

    private RestaurantResponse toResponse(Restaurant restaurant) {
        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getSlug(),
                restaurant.getAddress(),
                restaurant.getPhone(),
                restaurant.getCuisineType(),
                restaurant.getLogoUrl(),
                restaurant.getFssaiLicense(),
                restaurant.getGstNumber(),
                restaurant.getOperatingHours(),
                restaurant.getDefaultPrepTimeMinutes(),
                reviewService.getAverageRating(restaurant.getId()),
                restaurant.getStatus(),
                restaurant.getCreatedAt(),
                restaurant.getUpdatedAt()
        );
    }

    private User resolveOwner(String actorEmail, String ownerEmail, boolean actorIsSuperAdmin) {
        if (actorIsSuperAdmin) {
            String ownerEmailValue = trimToNull(ownerEmail);
            if (ownerEmailValue == null) {
                throw new IllegalArgumentException("Owner email is required when creating restaurant as SUPER_ADMIN.");
            }
            return userRepository.findByEmail(ownerEmailValue)
                    .orElseThrow(() -> new IllegalArgumentException("Owner user not found for email: " + ownerEmailValue));
        }
        return userRepository.findByEmail(actorEmail)
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found."));
    }

    private String generateSlug(String name) {
        String base = name.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        if (base.isBlank()) {
            throw new IllegalArgumentException("Unable to generate a valid slug from restaurant name.");
        }
        return base;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}