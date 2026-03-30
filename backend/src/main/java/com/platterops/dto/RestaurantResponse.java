package com.platterops.dto;

import com.platterops.restaurant.RestaurantStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "Restaurant response payload")
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
        Boolean isOpenNow,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
