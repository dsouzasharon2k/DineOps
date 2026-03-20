package com.dineops.menu;

import com.dineops.dto.MenuItemResponse;
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
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final MenuCategoryRepository menuCategoryRepository;
    private final RestaurantRepository restaurantRepository;

    public MenuItemService(MenuItemRepository menuItemRepository,
                           MenuCategoryRepository menuCategoryRepository,
                           RestaurantRepository restaurantRepository) {
        this.menuItemRepository = menuItemRepository;
        this.menuCategoryRepository = menuCategoryRepository;
        this.restaurantRepository = restaurantRepository;
    }

    // Get all available items for a category
    public List<MenuItem> getItemsByCategory(UUID categoryId) {
        return menuItemRepository
                .findByCategoryIdAndIsAvailableTrueOrderByDisplayOrderAsc(categoryId);
    }

    @Cacheable(cacheNames = "menu:items:by-category", key = "#categoryId")
    public List<MenuItemResponse> getItemResponsesByCategory(UUID categoryId) {
        return getItemsByCategory(categoryId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Get full menu for a restaurant (all items grouped will be done on frontend)
    public List<MenuItem> getItemsByTenant(UUID tenantId) {
        return menuItemRepository
                .findByTenantIdAndIsAvailableTrueOrderByDisplayOrderAsc(tenantId);
    }

    // Create a new menu item
    @CacheEvict(cacheNames = "menu:items:by-category", key = "#categoryId")
    public MenuItem createItem(UUID tenantId, UUID categoryId, CreateMenuItemRequest request) {
        Restaurant restaurant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        MenuCategory category = menuCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("Category not found"));

        MenuItem item = new MenuItem();
        item.setTenant(restaurant);
        item.setCategory(category);
        item.setName(request.name());
        item.setDescription(request.description());
        item.setPrice(request.price()); // price in paise
        item.setVegetarian(request.isVegetarian());
        item.setImageUrl(request.imageUrl());
        item.setPrepTimeMinutes(request.prepTimeMinutes());

        return menuItemRepository.save(item);
    }

    public MenuItemResponse createItemResponse(UUID tenantId, UUID categoryId, CreateMenuItemRequest request) {
        return toResponse(createItem(tenantId, categoryId, request));
    }

    // Soft delete - mark as unavailable instead of deleting
    @CacheEvict(cacheNames = "menu:items:by-category", allEntries = true)
    public void deleteItem(UUID itemId) {
        MenuItem item = menuItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found"));
        item.setAvailable(false);
        menuItemRepository.save(item);
    }

    private MenuItemResponse toResponse(MenuItem item) {
        return new MenuItemResponse(
                item.getId(),
                item.getTenant().getId(),
                item.getCategory().getId(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.getImageUrl(),
                item.isVegetarian(),
                item.isAvailable(),
                item.getDisplayOrder(),
                item.getPrepTimeMinutes(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}