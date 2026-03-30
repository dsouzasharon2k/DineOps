package com.platterops.restaurant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

public record CreateRestaurantRequest(
        @NotBlank(message = "Restaurant name is required") String name,
        String address,
        String phone,
        String cuisineType,
        String logoUrl,
        String fssaiLicense,
        @Pattern(
                regexp = "^$|^[0-9A-Z]{15}$",
                message = "GST number must be 15 uppercase alphanumeric characters"
        ) String gstNumber,
        String operatingHours,
        @Min(value = 1, message = "Default prep time must be at least 1 minute") Integer defaultPrepTimeMinutes,
        String ownerEmail
) {
}
