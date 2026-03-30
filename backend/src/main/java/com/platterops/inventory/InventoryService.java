package com.platterops.inventory;

import com.platterops.dto.CreateInventoryRequest;
import com.platterops.dto.InventoryResponse;
import com.platterops.dto.UpdateInventoryRequest;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.menu.MenuItem;
import com.platterops.menu.MenuItemRepository;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;

    public InventoryService(InventoryRepository inventoryRepository,
                            MenuItemRepository menuItemRepository,
                            RestaurantRepository restaurantRepository) {
        this.inventoryRepository = inventoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.restaurantRepository = restaurantRepository;
    }

    public List<InventoryResponse> getByTenant(UUID tenantId) {
        return inventoryRepository.findByTenantIdOrderByUpdatedAtDesc(tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public InventoryResponse createOrReplace(CreateInventoryRequest request) {
        MenuItem menuItem = menuItemRepository.findById(request.menuItemId())
                .orElseThrow(() -> new EntityNotFoundException("Menu item not found"));
        Restaurant tenant = restaurantRepository.findById(menuItem.getTenant().getId())
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        Inventory inventory = inventoryRepository.findByMenuItemId(menuItem.getId()).orElseGet(Inventory::new);
        inventory.setMenuItem(menuItem);
        inventory.setTenant(tenant);
        inventory.setQuantity(request.quantity());
        inventory.setLowStockThreshold(request.lowStockThreshold());
        syncAvailability(menuItem, request.quantity());
        return toResponse(inventoryRepository.save(inventory));
    }

    @Transactional
    public InventoryResponse update(UUID inventoryId, UpdateInventoryRequest request) {
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new EntityNotFoundException("Inventory record not found"));
        inventory.setQuantity(request.quantity());
        inventory.setLowStockThreshold(request.lowStockThreshold());
        syncAvailability(inventory.getMenuItem(), request.quantity());
        return toResponse(inventoryRepository.save(inventory));
    }

    @Transactional
    public void consumeStockIfTracked(MenuItem menuItem, int quantityToConsume) {
        inventoryRepository.findByMenuItemId(menuItem.getId()).ifPresent(inventory -> {
            int current = inventory.getQuantity() == null ? 0 : inventory.getQuantity();
            int updated = current - quantityToConsume;
            if (updated < 0) {
                throw new IllegalArgumentException("Insufficient inventory for item: " + menuItem.getName());
            }
            inventory.setQuantity(updated);
            syncAvailability(menuItem, updated);
            inventoryRepository.save(inventory);
        });
    }

    private InventoryResponse toResponse(Inventory inventory) {
        int quantity = inventory.getQuantity() == null ? 0 : inventory.getQuantity();
        int threshold = inventory.getLowStockThreshold() == null ? 0 : inventory.getLowStockThreshold();
        return new InventoryResponse(
                inventory.getId(),
                inventory.getMenuItem().getId(),
                inventory.getMenuItem().getName(),
                inventory.getTenant().getId(),
                quantity,
                threshold,
                quantity <= threshold,
                inventory.getMenuItem().isAvailable(),
                inventory.getCreatedAt(),
                inventory.getUpdatedAt()
        );
    }

    private void syncAvailability(MenuItem menuItem, int quantity) {
        boolean shouldBeAvailable = quantity > 0;
        if (menuItem.isAvailable() != shouldBeAvailable) {
            menuItem.setAvailable(shouldBeAvailable);
            menuItemRepository.save(menuItem);
        }
    }
}
