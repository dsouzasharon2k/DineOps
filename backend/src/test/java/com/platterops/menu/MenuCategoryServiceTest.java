package com.platterops.menu;

import com.platterops.exception.EntityNotFoundException;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
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
class MenuCategoryServiceTest {

    private MenuCategoryRepository menuCategoryRepository;
    private RestaurantRepository restaurantRepository;
    private MenuCategoryService menuCategoryService;

    @BeforeEach
    void setUp() {
        menuCategoryRepository = Mockito.mock(MenuCategoryRepository.class);
        restaurantRepository = Mockito.mock(RestaurantRepository.class);
        menuCategoryService = new MenuCategoryService(menuCategoryRepository, restaurantRepository);
    }

    @Test
    void getCategoriesByTenant_returnsRepositoryData() {
        UUID tenantId = UUID.randomUUID();
        MenuCategory category = new MenuCategory();
        category.setName("Starters");
        when(menuCategoryRepository.findByTenant_IdAndIsActiveTrueOrderByDisplayOrderAsc(tenantId))
                .thenReturn(List.of(category));

        List<MenuCategory> result = menuCategoryService.getCategoriesByTenant(tenantId);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getName()).isEqualTo("Starters");
    }

    @Test
    void createCategory_whenRestaurantExists_savesCategory() {
        UUID tenantId = UUID.randomUUID();
        Restaurant restaurant = new Restaurant();
        restaurant.setName("Tenant A");
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(restaurant));
        when(menuCategoryRepository.save(any(MenuCategory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MenuCategory created = menuCategoryService.createCategory(tenantId, "Main Course", "Chef specials");

        assertThat(created.getTenant()).isEqualTo(restaurant);
        assertThat(created.getName()).isEqualTo("Main Course");
        assertThat(created.getDescription()).isEqualTo("Chef specials");
        verify(menuCategoryRepository).save(any(MenuCategory.class));
    }

    @Test
    void createCategory_whenRestaurantMissing_throwsEntityNotFound() {
        UUID tenantId = UUID.randomUUID();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.empty());

        EntityNotFoundException ex = assertThrows(
                EntityNotFoundException.class,
                () -> menuCategoryService.createCategory(tenantId, "Main Course", "Chef specials"));

        assertThat(ex.getMessage()).isEqualTo("Restaurant not found");
    }

    @Test
    void deleteCategory_marksInactiveAndSaves() {
        UUID categoryId = UUID.randomUUID();
        MenuCategory existing = new MenuCategory();
        existing.setActive(true);
        when(menuCategoryRepository.findById(categoryId)).thenReturn(Optional.of(existing));

        menuCategoryService.deleteCategory(categoryId);

        assertThat(existing.isActive()).isFalse();
        verify(menuCategoryRepository).save(existing);
    }
}
