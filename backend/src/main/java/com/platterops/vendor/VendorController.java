package com.platterops.vendor;

import com.platterops.dto.CreateVendorRequest;
import com.platterops.dto.LinkInventoryToVendorRequest;
import com.platterops.dto.VendorResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/vendors")
public class VendorController {

    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @GetMapping
    public ResponseEntity<List<VendorResponse>> list(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(vendorService.getByTenant(tenantId));
    }

    @GetMapping("/{vendorId}")
    public ResponseEntity<VendorResponse> get(@PathVariable UUID tenantId, @PathVariable UUID vendorId) {
        return ResponseEntity.ok(vendorService.getById(tenantId, vendorId));
    }

    @PostMapping
    public ResponseEntity<VendorResponse> create(
            @PathVariable UUID tenantId,
            @RequestBody @Valid CreateVendorRequest request) {
        return ResponseEntity.status(201).body(vendorService.create(tenantId, request));
    }

    @PutMapping("/{vendorId}")
    public ResponseEntity<VendorResponse> update(
            @PathVariable UUID tenantId,
            @PathVariable UUID vendorId,
            @RequestBody @Valid CreateVendorRequest request) {
        return ResponseEntity.ok(vendorService.update(tenantId, vendorId, request));
    }

    @DeleteMapping("/{vendorId}")
    public ResponseEntity<Void> delete(@PathVariable UUID tenantId, @PathVariable UUID vendorId) {
        vendorService.delete(tenantId, vendorId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{vendorId}/items")
    public ResponseEntity<VendorResponse> linkItem(
            @PathVariable UUID tenantId,
            @PathVariable UUID vendorId,
            @RequestBody @Valid LinkInventoryToVendorRequest request) {
        return ResponseEntity.ok(vendorService.linkInventory(tenantId, vendorId, request));
    }

    @DeleteMapping("/{vendorId}/items/{inventoryId}")
    public ResponseEntity<Void> unlinkItem(
            @PathVariable UUID tenantId,
            @PathVariable UUID vendorId,
            @PathVariable UUID inventoryId) {
        vendorService.unlinkInventory(tenantId, vendorId, inventoryId);
        return ResponseEntity.noContent().build();
    }
}
