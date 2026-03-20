package com.dineops.inventory;

import com.dineops.dto.CreateInventoryRequest;
import com.dineops.dto.InventoryResponse;
import com.dineops.dto.UpdateInventoryRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ResponseEntity<List<InventoryResponse>> getByTenant(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(inventoryService.getByTenant(tenantId));
    }

    @PostMapping
    public ResponseEntity<InventoryResponse> createOrReplace(@RequestBody @Valid CreateInventoryRequest request) {
        return ResponseEntity.status(201).body(inventoryService.createOrReplace(request));
    }

    @PutMapping("/{inventoryId}")
    public ResponseEntity<InventoryResponse> update(
            @PathVariable UUID inventoryId,
            @RequestBody @Valid UpdateInventoryRequest request
    ) {
        return ResponseEntity.ok(inventoryService.update(inventoryId, request));
    }
}
