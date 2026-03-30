package com.platterops.restaurant;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID> {
    boolean existsBySlug(String slug);
}