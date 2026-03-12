package com.dineops.menu;

import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class MenuCategoryService {

    private final MenuCategoryRepository menuCategoryRepository;
    private final RestaurantRepository restaurantRepository;

    public MenuCategoryService(MenuCategoryRepository menuCategoryRepository,
                               RestaurantRepository restaurantRepository) {
        this.menuCategoryRepository = menuCategoryRepository;
        this.restaurantRepository = restaurantRepository;
    }

    // Get all active categories for a restaurant
    public List<MenuCategory> getCategoriesByTenant(UUID tenantId) {
        return menuCategoryRepository
                .findByTenant_IdAndIsActiveTrueOrderByDisplayOrderAsc(tenantId);
    }

    // Create a new category for a restaurant
    public MenuCategory createCategory(UUID tenantId, String name, String description) {
        // Find the restaurant - throw exception if not found
        Restaurant restaurant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));

        MenuCategory category = new MenuCategory();
        category.setTenant(restaurant);
        category.setName(name);
        category.setDescription(description);

        return menuCategoryRepository.save(category);
    }

    // Soft delete - mark as inactive instead of deleting from DB
    // This preserves historical data and is safer than hard delete
    public void deleteCategory(UUID categoryId) {
        MenuCategory category = menuCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        category.setActive(false);
        menuCategoryRepository.save(category);
    }
}