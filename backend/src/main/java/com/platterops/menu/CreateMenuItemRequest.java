package com.dineops.menu;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Record used as request body for creating a menu item
// price must be in paise e.g. Rs 150 = 15000
public record CreateMenuItemRequest(
        @NotBlank(message = "Name is required") String name,
        String description,
        @NotNull(message = "Price is required") @Min(value = 0, message = "Price must be non-negative") Integer price,
        boolean isVegetarian,
        String imageUrl,
        @Min(value = 1, message = "Prep time must be at least 1 minute") Integer prepTimeMinutes
) {}