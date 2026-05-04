package com.platterops.vendor;

import com.platterops.dto.CreatePurchaseOrderRequest;
import com.platterops.dto.PurchaseOrderResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.inventory.Inventory;
import com.platterops.inventory.InventoryRepository;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final VendorRepository vendorRepository;
    private final RestaurantRepository restaurantRepository;
    private final InventoryRepository inventoryRepository;
    private final VendorItemRepository vendorItemRepository;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository,
                                VendorRepository vendorRepository,
                                RestaurantRepository restaurantRepository,
                                InventoryRepository inventoryRepository,
                                VendorItemRepository vendorItemRepository) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.vendorRepository = vendorRepository;
        this.restaurantRepository = restaurantRepository;
        this.inventoryRepository = inventoryRepository;
        this.vendorItemRepository = vendorItemRepository;
    }

    public List<PurchaseOrderResponse> getByTenant(UUID tenantId) {
        return purchaseOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    public PurchaseOrderResponse getById(UUID tenantId, UUID poId) {
        PurchaseOrder po = findTenantPO(tenantId, poId);
        return toResponse(po);
    }

    @Transactional
    public PurchaseOrderResponse create(UUID tenantId, CreatePurchaseOrderRequest request) {
        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        Vendor vendor = vendorRepository.findById(request.vendorId())
                .orElseThrow(() -> new EntityNotFoundException("Vendor not found"));
        if (!vendor.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Vendor does not belong to tenant");
        }

        PurchaseOrder po = new PurchaseOrder();
        po.setTenant(tenant);
        po.setVendor(vendor);
        po.setNotes(request.notes());
        po.setStatus("DRAFT");

        long total = 0;
        for (CreatePurchaseOrderRequest.POItemRequest itemReq : request.items()) {
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(po);
            item.setItemName(itemReq.itemName());
            item.setQuantity(itemReq.quantity() == null ? BigDecimal.ONE : itemReq.quantity());
            item.setUnit(itemReq.unit() == null ? "pcs" : itemReq.unit());
            item.setUnitPrice(itemReq.unitPrice());
            long itemTotal = (long) (itemReq.quantity().doubleValue() * itemReq.unitPrice());
            item.setTotalPrice(itemTotal);
            total += itemTotal;

            if (itemReq.inventoryId() != null) {
                inventoryRepository.findById(itemReq.inventoryId()).ifPresent(item::setInventory);
            }
            po.getItems().add(item);
        }
        po.setTotalAmount(total);

        return toResponse(purchaseOrderRepository.save(po));
    }

    @Transactional
    public PurchaseOrderResponse updateStatus(UUID tenantId, UUID poId, String newStatus) {
        PurchaseOrder po = findTenantPO(tenantId, poId);
        String current = po.getStatus();

        if ("CANCELLED".equals(current) || "RECEIVED".equals(current)) {
            throw new IllegalStateException("Cannot change status of a " + current + " purchase order");
        }

        po.setStatus(newStatus);

        if ("RECEIVED".equals(newStatus)) {
            po.setReceivedAt(LocalDateTime.now());
            // Restock: add purchased quantities to inventory and update vendor_items price
            for (PurchaseOrderItem item : po.getItems()) {
                if (item.getInventory() != null) {
                    Inventory inv = item.getInventory();
                    int added = (int) Math.ceil(item.getQuantity().doubleValue());
                    inv.setQuantity((inv.getQuantity() == null ? 0 : inv.getQuantity()) + added);
                    inventoryRepository.save(inv);

                    // Record last purchase price on vendor_item link
                    vendorItemRepository.findByVendorIdAndInventoryId(po.getVendor().getId(), inv.getId())
                            .ifPresent(vi -> {
                                vi.setLastPurchasePrice(item.getUnitPrice());
                                vi.setUpdatedAt(LocalDateTime.now());
                                vendorItemRepository.save(vi);
                            });
                }
            }
        }

        return toResponse(purchaseOrderRepository.save(po));
    }

    private PurchaseOrder findTenantPO(UUID tenantId, UUID poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found"));
        if (!po.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Purchase order does not belong to tenant");
        }
        return po;
    }

    private PurchaseOrderResponse toResponse(PurchaseOrder po) {
        List<PurchaseOrderResponse.POItemDetail> items = po.getItems().stream()
                .map(i -> new PurchaseOrderResponse.POItemDetail(
                        i.getId(),
                        i.getInventory() != null ? i.getInventory().getId() : null,
                        i.getItemName(),
                        i.getQuantity(),
                        i.getUnit(),
                        i.getUnitPrice(),
                        i.getTotalPrice()
                ))
                .toList();

        return new PurchaseOrderResponse(
                po.getId(),
                po.getTenant().getId(),
                po.getVendor().getId(),
                po.getVendor().getVendorName(),
                po.getVendor().getPhoneNumber(),
                po.getStatus(),
                po.getTotalAmount(),
                po.getNotes(),
                po.getReceivedAt(),
                items,
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }
}
