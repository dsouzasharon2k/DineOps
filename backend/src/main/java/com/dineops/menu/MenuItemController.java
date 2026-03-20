package com.dineops.menu;

import com.dineops.dto.MenuItemResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/categories/{categoryId}/items")
public class MenuItemController {

    private final MenuItemService menuItemService;

    public MenuItemController(MenuItemService menuItemService) {
        this.menuItemService = menuItemService;
    }

    // GET /api/v1/restaurants/{tenantId}/categories/{categoryId}/items
    // Returns all available items for a category
    @GetMapping
    public ResponseEntity<List<MenuItemResponse>> getItems(@PathVariable UUID categoryId) {
        return ResponseEntity.ok(menuItemService.getItemResponsesByCategory(categoryId));
    }

    // POST /api/v1/restaurants/{tenantId}/categories/{categoryId}/items
    // Creates a new menu item under a category
    @PostMapping
    public ResponseEntity<MenuItemResponse> createItem(
            @PathVariable UUID tenantId,
            @PathVariable UUID categoryId,
            @RequestBody @Valid CreateMenuItemRequest request) {
        MenuItemResponse item = menuItemService.createItemResponse(tenantId, categoryId, request);
        return ResponseEntity.status(201).body(item);
    }

    // DELETE /api/v1/restaurants/{tenantId}/categories/{categoryId}/items/{itemId}
    // Soft deletes an item (marks as unavailable)
    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID itemId) {
        menuItemService.deleteItem(itemId);
        return ResponseEntity.noContent().build();
    }
}