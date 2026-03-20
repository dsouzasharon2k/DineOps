package com.dineops.menu;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/categories")
public class MenuCategoryController {

    private final MenuCategoryService menuCategoryService;

    public MenuCategoryController(MenuCategoryService menuCategoryService) {
        this.menuCategoryService = menuCategoryService;
    }

    // GET /api/v1/restaurants/{tenantId}/categories
    // Returns all active categories for a restaurant
    @GetMapping
    public ResponseEntity<List<MenuCategory>> getCategories(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(menuCategoryService.getCategoriesByTenant(tenantId));
    }

    // POST /api/v1/restaurants/{tenantId}/categories
    // Creates a new category for a restaurant
    @PostMapping
    public ResponseEntity<MenuCategory> createCategory(
            @PathVariable UUID tenantId,
            @RequestBody @Valid CreateCategoryRequest request) {
        MenuCategory category = menuCategoryService.createCategory(
                tenantId,
                request.name(),
                request.description()
        );
        return ResponseEntity.status(201).body(category);
    }

    // DELETE /api/v1/restaurants/{tenantId}/categories/{categoryId}
    // Soft deletes a category (marks as inactive)
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID categoryId) {
        menuCategoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}