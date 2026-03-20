package com.dineops.restaurant;

import com.dineops.dto.RestaurantResponse;
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

    public RestaurantService(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
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
                restaurant.getStatus(),
                restaurant.getCreatedAt(),
                restaurant.getUpdatedAt()
        );
    }
}