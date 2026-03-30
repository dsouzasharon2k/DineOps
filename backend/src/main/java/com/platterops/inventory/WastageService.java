package com.platterops.inventory;

import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import com.platterops.menu.MenuItem;
import com.platterops.menu.MenuItemRepository;
import com.platterops.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WastageService {
    private final WastageRepository wastageRepository;
    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;

    public WastageService(WastageRepository wastageRepository, 
                          RestaurantRepository restaurantRepository,
                          MenuItemRepository menuItemRepository) {
        this.wastageRepository = wastageRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
    }

    public List<Wastage> getWastageByTenant(UUID tenantId) {
        return wastageRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Transactional
    public Wastage logWastage(UUID tenantId, UUID menuItemId, Integer quantity, String reason) {
        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        MenuItem menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new EntityNotFoundException("Menu item not found"));

        Wastage wastage = new Wastage();
        wastage.setTenant(tenant);
        wastage.setMenuItem(menuItem);
        wastage.setQuantity(quantity);
        wastage.setUnitCost(menuItem.getBaseCost() != null ? menuItem.getBaseCost() : 0L);
        wastage.setReason(reason);

        return wastageRepository.save(wastage);
    }
}
