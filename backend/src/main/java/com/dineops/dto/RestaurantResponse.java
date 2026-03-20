package com.dineops.dto;

import com.dineops.restaurant.RestaurantStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record RestaurantResponse(
        UUID id,
        String name,
        String slug,
        String address,
        String phone,
        String cuisineType,
        String logoUrl,
        String fssaiLicense,
        String gstNumber,
        String operatingHours,
        Integer defaultPrepTimeMinutes,
        Double averageRating,
        RestaurantStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
