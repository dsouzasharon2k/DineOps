package com.platterops.table;

import com.platterops.dto.DiningTableResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/tables")
public class DiningTableController {
    private final DiningTableService diningTableService;

    public DiningTableController(DiningTableService diningTableService) {
        this.diningTableService = diningTableService;
    }

    @GetMapping
    public ResponseEntity<List<DiningTableResponse>> getTables(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(diningTableService.getByTenant(tenantId));
    }

    @PostMapping
    public ResponseEntity<DiningTableResponse> createTable(
            @PathVariable UUID tenantId,
            @RequestBody @Valid CreateDiningTableRequest request) {
        return ResponseEntity.status(201).body(diningTableService.create(tenantId, request));
    }

    @PutMapping("/{tableId}")
    public ResponseEntity<DiningTableResponse> updateTable(
            @PathVariable UUID tenantId,
            @PathVariable UUID tableId,
            @RequestBody @Valid UpdateDiningTableRequest request) {
        return ResponseEntity.ok(diningTableService.update(tenantId, tableId, request));
    }

    @DeleteMapping("/{tableId}")
    public ResponseEntity<Void> deleteTable(@PathVariable UUID tenantId, @PathVariable UUID tableId) {
        diningTableService.delete(tenantId, tableId);
        return ResponseEntity.noContent().build();
    }
}
