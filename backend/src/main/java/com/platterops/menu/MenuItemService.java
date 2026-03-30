package com.platterops.menu;

import com.platterops.dto.MenuItemResponse;
import com.platterops.dto.MenuItemResponse.NutritionRow;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@SuppressWarnings("null")
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final MenuCategoryRepository menuCategoryRepository;
    private final RestaurantRepository restaurantRepository;
    private final com.platterops.restaurant.zone.MenuItemZonePriceRepository menuItemZonePriceRepository;

    public MenuItemService(MenuItemRepository menuItemRepository,
                           MenuCategoryRepository menuCategoryRepository,
                           RestaurantRepository restaurantRepository,
                           com.platterops.restaurant.zone.MenuItemZonePriceRepository menuItemZonePriceRepository) {
        this.menuItemRepository = menuItemRepository;
        this.menuCategoryRepository = menuCategoryRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemZonePriceRepository = menuItemZonePriceRepository;
    }

    // Get all available items for a category
    public List<MenuItem> getItemsByCategory(UUID categoryId) {
        return menuItemRepository
                .findByCategory_IdAndIsAvailableTrueOrderByDisplayOrderAsc(categoryId);
    }

    public List<MenuItemResponse> getItemResponsesByCategory(UUID categoryId) {
        return getItemsByCategory(categoryId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(value = "menu:items", key = "#tenantId")
    public List<MenuItemResponse> getItemResponsesByTenant(UUID tenantId) {
        return menuItemRepository.findByTenant_IdAndIsAvailableTrueOrderByDisplayOrderAsc(tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Get full menu for a restaurant
    public List<MenuItem> getItemsByTenant(UUID tenantId) {
        return menuItemRepository
                .findByTenant_IdAndIsAvailableTrueOrderByDisplayOrderAsc(tenantId);
    }

    public List<MenuItemResponse> getZoneAwareItemResponses(UUID tenantId, UUID zoneId) {
        List<MenuItem> items = getItemsByTenant(tenantId);
        return items.stream()
                .map(item -> {
                    Integer price = item.getPrice();
                    var override = menuItemZonePriceRepository.findByMenuItemIdAndDiningZoneId(item.getId(), zoneId);
                    if (override.isPresent() && override.get().getOverridePrice() != null) {
                        price = override.get().getOverridePrice().intValue();
                    }
                    return toResponse(item, price);
                })
                .toList();
    }

    // Create a new menu item
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

    @Transactional
    @CacheEvict(value = "menu:items", key = "#tenantId")
    public MenuItemResponse createItemResponse(UUID tenantId, UUID categoryId, CreateMenuItemRequest request) {
        return toResponse(createItem(tenantId, categoryId, request));
    }

    // Get ALL items (available + unavailable) for admin management view
    public List<MenuItem> getAllItemsByCategory(UUID categoryId) {
        return menuItemRepository.findByCategory_IdOrderByDisplayOrderAsc(categoryId);
    }

    public List<MenuItemResponse> getAllItemResponsesByCategory(UUID categoryId) {
        return getAllItemsByCategory(categoryId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Toggle is_available on an item
    public MenuItemResponse toggleAvailability(UUID itemId) {
        MenuItem item = menuItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found"));
        item.setAvailable(!item.isAvailable());
        return toResponse(menuItemRepository.save(item));
    }

    // Soft delete - mark as unavailable instead of deleting
    public void deleteItem(UUID itemId) {
        MenuItem item = menuItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found"));
        item.setAvailable(false);
        item.setDeletedAt(LocalDateTime.now());
        menuItemRepository.save(item);
    }

    private MenuItemResponse toResponse(MenuItem item) {
        return toResponse(item, item.getPrice());
    }

    private MenuItemResponse toResponse(MenuItem item, Integer price) {
        return new MenuItemResponse(
                item.getId(),
                item.getTenant().getId(),
                item.getCategory().getId(),
                item.getName(),
                item.getDescription(),
                price,
                item.getImageUrl(),
                item.isVegetarian(),
                item.isAvailable(),
                item.getDisplayOrder(),
                item.getPrepTimeMinutes(),
                item.getCreatedAt(),
                item.getUpdatedAt(),
                item.getDietType(),
                item.getServingSize(),
                item.getIngredients(),
                new ArrayList<>(),
                new ArrayList<>(),
                new ArrayList<>()
        );
    }
}