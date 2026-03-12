package com.dineops.menu;

// Record used as request body for creating a menu item
// price must be in paise e.g. Rs 150 = 15000
public record CreateMenuItemRequest(
        String name,
        String description,
        Integer price,
        boolean isVegetarian,
        String imageUrl
) {}