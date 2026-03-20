package com.dineops.menu;

import com.dineops.dto.MenuCategoryResponse;
import com.dineops.exception.EntityNotFoundException;
import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@SuppressWarnings("null")
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

    @Cacheable(cacheNames = "menu:categories", key = "#tenantId")
    public List<MenuCategoryResponse> getCategoryResponsesByTenant(UUID tenantId) {
        return getCategoriesByTenant(tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Create a new category for a restaurant
    @CacheEvict(cacheNames = "menu:categories", key = "#tenantId")
    public MenuCategory createCategory(UUID tenantId, String name, String description) {
        // Find the restaurant - throw exception if not found
        Restaurant restaurant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        MenuCategory category = new MenuCategory();
        category.setTenant(restaurant);
        category.setName(name);
        category.setDescription(description);

        return menuCategoryRepository.save(category);
    }

    public MenuCategoryResponse createCategoryResponse(UUID tenantId, String name, String description) {
        return toResponse(createCategory(tenantId, name, description));
    }

    // Soft delete - mark as inactive instead of deleting from DB
    // This preserves historical data and is safer than hard delete
    @CacheEvict(cacheNames = "menu:categories", allEntries = true)
    public void deleteCategory(UUID categoryId) {
        MenuCategory category = menuCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));
        category.setActive(false);
        menuCategoryRepository.save(category);
    }

    private MenuCategoryResponse toResponse(MenuCategory category) {
        return new MenuCategoryResponse(
                category.getId(),
                category.getTenant().getId(),
                category.getName(),
                category.getDescription(),
                category.getDisplayOrder(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}