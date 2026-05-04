package com.platterops.vendor;

import com.platterops.dto.CreatePurchaseOrderRequest;
import com.platterops.dto.PurchaseOrderResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    public ResponseEntity<List<PurchaseOrderResponse>> list(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(purchaseOrderService.getByTenant(tenantId));
    }

    @GetMapping("/{poId}")
    public ResponseEntity<PurchaseOrderResponse> get(@PathVariable UUID tenantId, @PathVariable UUID poId) {
        return ResponseEntity.ok(purchaseOrderService.getById(tenantId, poId));
    }

    @PostMapping
    public ResponseEntity<PurchaseOrderResponse> create(
            @PathVariable UUID tenantId,
            @RequestBody @Valid CreatePurchaseOrderRequest request) {
        return ResponseEntity.status(201).body(purchaseOrderService.create(tenantId, request));
    }

    @PatchMapping("/{poId}/status")
    public ResponseEntity<PurchaseOrderResponse> updateStatus(
            @PathVariable UUID tenantId,
            @PathVariable UUID poId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || !List.of("DRAFT", "SENT", "RECEIVED", "CANCELLED").contains(status)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(purchaseOrderService.updateStatus(tenantId, poId, status));
    }
}
