package com.dineops.menu;

import com.dineops.exception.EntityNotFoundException;
import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class MenuItemServiceTest {

    private MenuItemRepository menuItemRepository;
    private MenuCategoryRepository menuCategoryRepository;
    private RestaurantRepository restaurantRepository;
    private MenuItemService menuItemService;

    @BeforeEach
    void setUp() {
        menuItemRepository = Mockito.mock(MenuItemRepository.class);
        menuCategoryRepository = Mockito.mock(MenuCategoryRepository.class);
        restaurantRepository = Mockito.mock(RestaurantRepository.class);
        menuItemService = new MenuItemService(menuItemRepository, menuCategoryRepository, restaurantRepository);
    }

    @Test
    void getItemsByCategory_returnsRepositoryData() {
        UUID categoryId = UUID.randomUUID();
        MenuItem item = new MenuItem();
        item.setName("Paneer Tikka");
        when(menuItemRepository.findByCategoryIdAndIsAvailableTrueOrderByDisplayOrderAsc(categoryId))
                .thenReturn(List.of(item));

        List<MenuItem> result = menuItemService.getItemsByCategory(categoryId);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getName()).isEqualTo("Paneer Tikka");
    }

    @Test
    void createItem_whenRestaurantAndCategoryExist_savesItem() {
        UUID tenantId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        Restaurant restaurant = new Restaurant();
        MenuCategory category = new MenuCategory();

        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(restaurant));
        when(menuCategoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(menuItemRepository.save(any(MenuItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateMenuItemRequest request = new CreateMenuItemRequest(
                "Veg Biryani", "Serves 1", 29900, true, null);

        MenuItem created = menuItemService.createItem(tenantId, categoryId, request);

        assertThat(created.getTenant()).isEqualTo(restaurant);
        assertThat(created.getCategory()).isEqualTo(category);
        assertThat(created.getName()).isEqualTo("Veg Biryani");
        assertThat(created.getPrice()).isEqualTo(29900);
        assertThat(created.isVegetarian()).isTrue();
        verify(menuItemRepository).save(any(MenuItem.class));
    }

    @Test
    void createItem_whenRestaurantMissing_throwsEntityNotFound() {
        UUID tenantId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.empty());

        CreateMenuItemRequest request = new CreateMenuItemRequest(
                "Veg Biryani", "Serves 1", 29900, true, null);

        EntityNotFoundException ex = assertThrows(
                EntityNotFoundException.class,
                () -> menuItemService.createItem(tenantId, categoryId, request));

        assertThat(ex.getMessage()).isEqualTo("Restaurant not found");
    }

    @Test
    void deleteItem_marksUnavailableAndSaves() {
        UUID itemId = UUID.randomUUID();
        MenuItem existing = new MenuItem();
        existing.setAvailable(true);
        when(menuItemRepository.findById(itemId)).thenReturn(Optional.of(existing));

        menuItemService.deleteItem(itemId);

        assertThat(existing.isAvailable()).isFalse();
        verify(menuItemRepository).save(existing);
    }
}
