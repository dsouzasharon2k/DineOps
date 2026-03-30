package com.dineops.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Schema(description = "Menu item response payload")
public record MenuItemResponse(
        UUID id,
        UUID tenantId,
        UUID categoryId,
        String name,
        String description,
        Integer price,
        String imageUrl,
        boolean isVegetarian,
        boolean isAvailable,
        Integer displayOrder,
        Integer prepTimeMinutes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String dietType,
        String servingSize,
        String ingredients,
        List<String> flavourProfile,
        List<String> allergens,
        List<NutritionRow> nutrition
) {
    public record NutritionRow(String label, String per100g, String perServing) {}
}
