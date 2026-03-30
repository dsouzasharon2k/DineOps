package com.platterops.inventory;

import com.platterops.dto.CreateWastageRequest;
import com.platterops.dto.WastageResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wastage")
public class WastageController {

    private final WastageService wastageService;

    public WastageController(WastageService wastageService) {
        this.wastageService = wastageService;
    }

    @GetMapping
    public ResponseEntity<List<WastageResponse>> getWastage(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(
                wastageService.getWastageByTenant(tenantId).stream()
                        .map(this::toResponse)
                        .toList()
        );
    }

    @PostMapping
    public ResponseEntity<WastageResponse> logWastage(@RequestBody @Valid CreateWastageRequest request) {
        Wastage created = wastageService.logWastage(
                request.tenantId(),
                request.menuItemId(),
                request.quantity(),
                request.reason()
        );
        return ResponseEntity.status(201).body(toResponse(created));
    }

    private WastageResponse toResponse(Wastage wastage) {
        return new WastageResponse(
                wastage.getId(),
                wastage.getTenant().getId(),
                wastage.getMenuItem() != null ? wastage.getMenuItem().getId() : null,
                wastage.getMenuItem() != null ? wastage.getMenuItem().getName() : null,
                wastage.getQuantity(),
                wastage.getUnitCost(),
                wastage.getReason(),
                wastage.getCreatedAt()
        );
    }
}
