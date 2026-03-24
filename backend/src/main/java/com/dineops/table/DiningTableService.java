package com.dineops.table;

import com.dineops.dto.DiningTableResponse;
import com.dineops.exception.EntityNotFoundException;
import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class DiningTableService {
    private final DiningTableRepository diningTableRepository;
    private final RestaurantRepository restaurantRepository;

    public DiningTableService(DiningTableRepository diningTableRepository, RestaurantRepository restaurantRepository) {
        this.diningTableRepository = diningTableRepository;
        this.restaurantRepository = restaurantRepository;
    }

    public List<DiningTableResponse> getByTenant(UUID tenantId) {
        return diningTableRepository.findByTenantIdOrderByTableNumberAsc(tenantId).stream().map(this::toResponse).toList();
    }

    public DiningTableResponse create(UUID tenantId, CreateDiningTableRequest request) {
        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        String tableNumber = request.tableNumber().trim();
        if (diningTableRepository.findByTenantIdAndTableNumber(tenantId, tableNumber).isPresent()) {
            throw new IllegalArgumentException("Table number already exists for this restaurant");
        }
        DiningTable table = new DiningTable();
        table.setTenant(tenant);
        table.setTableNumber(tableNumber);
        table.setCapacity(request.capacity());
        table.setStatus(DiningTableStatus.AVAILABLE);
        table.setQrCodeUrl("/menu/" + tenantId + "?table=" + tableNumber);
        return toResponse(diningTableRepository.save(table));
    }

    public DiningTableResponse update(UUID tenantId, UUID tableId, UpdateDiningTableRequest request) {
        DiningTable table = findTenantTable(tenantId, tableId);
        table.setCapacity(request.capacity());
        table.setStatus(request.status());
        return toResponse(diningTableRepository.save(table));
    }

    public void delete(UUID tenantId, UUID tableId) {
        DiningTable table = findTenantTable(tenantId, tableId);
        diningTableRepository.delete(table);
    }

    public DiningTable findByTenantAndNumber(UUID tenantId, String tableNumber) {
        return diningTableRepository.findByTenantIdAndTableNumber(tenantId, tableNumber.trim())
                .orElseThrow(() -> new EntityNotFoundException("Table not found for tableNumber: " + tableNumber));
    }

    /** Returns the table if it exists; used when placing orders so we can persist table_number even when table isn't pre-registered. */
    public java.util.Optional<DiningTable> findOptionalByTenantAndNumber(UUID tenantId, String tableNumber) {
        if (tableNumber == null || tableNumber.isBlank()) return java.util.Optional.empty();
        return diningTableRepository.findByTenantIdAndTableNumber(tenantId, tableNumber.trim());
    }

    private DiningTable findTenantTable(UUID tenantId, UUID tableId) {
        DiningTable table = diningTableRepository.findById(tableId)
                .orElseThrow(() -> new EntityNotFoundException("Table not found"));
        if (!table.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Table does not belong to tenant");
        }
        return table;
    }

    private DiningTableResponse toResponse(DiningTable table) {
        return new DiningTableResponse(
                table.getId(),
                table.getTenant().getId(),
                table.getTableNumber(),
                table.getCapacity(),
                table.getStatus(),
                table.getQrCodeUrl(),
                table.getCreatedAt(),
                table.getUpdatedAt()
        );
    }
}
