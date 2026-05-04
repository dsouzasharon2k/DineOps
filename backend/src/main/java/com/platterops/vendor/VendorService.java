package com.platterops.vendor;

import com.platterops.dto.CreateVendorRequest;
import com.platterops.dto.LinkInventoryToVendorRequest;
import com.platterops.dto.VendorResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.inventory.Inventory;
import com.platterops.inventory.InventoryRepository;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class VendorService {

    private final VendorRepository vendorRepository;
    private final VendorItemRepository vendorItemRepository;
    private final RestaurantRepository restaurantRepository;
    private final InventoryRepository inventoryRepository;

    public VendorService(VendorRepository vendorRepository,
                         VendorItemRepository vendorItemRepository,
                         RestaurantRepository restaurantRepository,
                         InventoryRepository inventoryRepository) {
        this.vendorRepository = vendorRepository;
        this.vendorItemRepository = vendorItemRepository;
        this.restaurantRepository = restaurantRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public List<VendorResponse> getByTenant(UUID tenantId) {
        return vendorRepository.findByTenantIdOrderByVendorNameAsc(tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    public VendorResponse getById(UUID tenantId, UUID vendorId) {
        Vendor vendor = findTenantVendor(tenantId, vendorId);
        return toResponse(vendor);
    }

    @Transactional
    public VendorResponse create(UUID tenantId, CreateVendorRequest request) {
        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        Vendor vendor = new Vendor();
        vendor.setTenant(tenant);
        applyRequest(vendor, request);
        return toResponse(vendorRepository.save(vendor));
    }

    @Transactional
    public VendorResponse update(UUID tenantId, UUID vendorId, CreateVendorRequest request) {
        Vendor vendor = findTenantVendor(tenantId, vendorId);
        applyRequest(vendor, request);
        return toResponse(vendorRepository.save(vendor));
    }

    @Transactional
    public void delete(UUID tenantId, UUID vendorId) {
        Vendor vendor = findTenantVendor(tenantId, vendorId);
        vendor.setDeletedAt(LocalDateTime.now());
        vendorRepository.save(vendor);
    }

    @Transactional
    public VendorResponse linkInventory(UUID tenantId, UUID vendorId, LinkInventoryToVendorRequest request) {
        Vendor vendor = findTenantVendor(tenantId, vendorId);
        Inventory inventory = inventoryRepository.findById(request.inventoryId())
                .orElseThrow(() -> new EntityNotFoundException("Inventory record not found"));

        VendorItem vi = vendorItemRepository
                .findByVendorIdAndInventoryId(vendorId, request.inventoryId())
                .orElseGet(VendorItem::new);
        vi.setVendor(vendor);
        vi.setInventory(inventory);
        vi.setLastPurchasePrice(request.lastPurchasePrice());
        vi.setPreferredVendor(request.preferredVendor());
        vi.setUpdatedAt(LocalDateTime.now());

        // If marking preferred, clear preferred flag on other vendors for same item
        if (request.preferredVendor()) {
            vendorItemRepository.findByInventoryId(request.inventoryId()).forEach(other -> {
                if (!other.getVendor().getId().equals(vendorId)) {
                    other.setPreferredVendor(false);
                    vendorItemRepository.save(other);
                }
            });
        }

        vendorItemRepository.save(vi);

        // Update inventory vendor_phone with this vendor's phone if preferred
        if (request.preferredVendor() && vendor.getPhoneNumber() != null) {
            inventory.setVendorPhone(vendor.getPhoneNumber());
            inventoryRepository.save(inventory);
        }

        return toResponse(vendorRepository.findById(vendorId).orElse(vendor));
    }

    @Transactional
    public void unlinkInventory(UUID tenantId, UUID vendorId, UUID inventoryId) {
        findTenantVendor(tenantId, vendorId);
        vendorItemRepository.deleteByVendorIdAndInventoryId(vendorId, inventoryId);
    }

    private void applyRequest(Vendor vendor, CreateVendorRequest req) {
        vendor.setVendorName(req.vendorName());
        vendor.setContactPerson(req.contactPerson());
        vendor.setPhoneNumber(req.phoneNumber());
        vendor.setCategory(req.category() == null ? "OTHER" : req.category());
        vendor.setAddress(req.address());
        vendor.setNotes(req.notes());
    }

    private Vendor findTenantVendor(UUID tenantId, UUID vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new EntityNotFoundException("Vendor not found"));
        if (!vendor.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Vendor does not belong to tenant");
        }
        return vendor;
    }

    public VendorResponse toResponse(Vendor vendor) {
        List<VendorResponse.VendorItemDetail> linkedItems = vendorItemRepository
                .findByVendorId(vendor.getId()).stream()
                .map(vi -> new VendorResponse.VendorItemDetail(
                        vi.getId(),
                        vi.getInventory().getId(),
                        vi.getInventory().getMenuItem().getName(),
                        vi.getInventory().getUnit() == null ? "pcs" : vi.getInventory().getUnit(),
                        vi.getLastPurchasePrice(),
                        vi.isPreferredVendor()
                ))
                .toList();

        return new VendorResponse(
                vendor.getId(),
                vendor.getTenant().getId(),
                vendor.getVendorName(),
                vendor.getContactPerson(),
                vendor.getPhoneNumber(),
                vendor.getCategory(),
                vendor.getAddress(),
                vendor.getNotes(),
                linkedItems,
                vendor.getCreatedAt(),
                vendor.getUpdatedAt()
        );
    }
}
