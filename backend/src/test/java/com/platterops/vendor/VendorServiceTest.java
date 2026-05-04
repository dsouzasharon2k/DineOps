package com.platterops.vendor;

import com.platterops.dto.CreateVendorRequest;
import com.platterops.dto.LinkInventoryToVendorRequest;
import com.platterops.dto.VendorResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.inventory.Inventory;
import com.platterops.inventory.InventoryRepository;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VendorServiceTest {

    private static void setEntityId(Object entity, UUID id) {
        try {
            java.lang.reflect.Field idField = entity.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
    }

    private VendorRepository vendorRepository;
    private VendorItemRepository vendorItemRepository;
    private RestaurantRepository restaurantRepository;
    private InventoryRepository inventoryRepository;
    private VendorService vendorService;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID vendorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        vendorRepository = mock(VendorRepository.class);
        vendorItemRepository = mock(VendorItemRepository.class);
        restaurantRepository = mock(RestaurantRepository.class);
        inventoryRepository = mock(InventoryRepository.class);
        vendorService = new VendorService(
                vendorRepository, vendorItemRepository, restaurantRepository, inventoryRepository
        );
    }

    private Restaurant mockRestaurant() {
        Restaurant r = new Restaurant();
        setEntityId(r, tenantId);
        r.setName("Test Restaurant");
        return r;
    }

    private Vendor mockVendor(Restaurant tenant) {
        Vendor v = new Vendor();
        setEntityId(v, vendorId);
        v.setTenant(tenant);
        v.setVendorName("Fresh Veggies Co.");
        v.setCategory("VEGETABLES");
        v.setPhoneNumber("+919876543210");
        return v;
    }

    // ─── getByTenant ────────────────────────────────────────────────────────────

    @Test
    void getByTenant_returnsVendorList() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);

        when(vendorRepository.findByTenantIdOrderByVendorNameAsc(tenantId))
                .thenReturn(List.of(vendor));
        when(vendorItemRepository.findByVendorId(vendorId)).thenReturn(List.of());

        List<VendorResponse> result = vendorService.getByTenant(tenantId);

        assertEquals(1, result.size());
        assertEquals("Fresh Veggies Co.", result.get(0).vendorName());
    }

    @Test
    void getByTenant_returnsEmptyListWhenNoVendors() {
        when(vendorRepository.findByTenantIdOrderByVendorNameAsc(tenantId)).thenReturn(List.of());

        List<VendorResponse> result = vendorService.getByTenant(tenantId);

        assertTrue(result.isEmpty());
    }

    // ─── create ─────────────────────────────────────────────────────────────────

    @Test
    void create_persistsVendorAndReturnsResponse() {
        Restaurant tenant = mockRestaurant();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

        Vendor savedVendor = new Vendor();
        setEntityId(savedVendor, UUID.randomUUID());
        savedVendor.setTenant(tenant);
        savedVendor.setVendorName("Dairy Direct");
        savedVendor.setCategory("DAIRY");
        when(vendorRepository.save(any(Vendor.class))).thenReturn(savedVendor);
        when(vendorItemRepository.findByVendorId(any())).thenReturn(List.of());

        CreateVendorRequest request = new CreateVendorRequest("Dairy Direct", "Ram", "+911234567890", "DAIRY", "Mumbai", "");
        VendorResponse result = vendorService.create(tenantId, request);

        assertEquals("Dairy Direct", result.vendorName());
        verify(vendorRepository).save(any(Vendor.class));
    }

    @Test
    void create_throwsWhenTenantNotFound() {
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.empty());

        CreateVendorRequest request = new CreateVendorRequest("X", null, null, "OTHER", null, null);

        assertThrows(EntityNotFoundException.class, () -> vendorService.create(tenantId, request));
        verify(vendorRepository, never()).save(any());
    }

    // ─── update ─────────────────────────────────────────────────────────────────

    @Test
    void update_changesVendorName() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);

        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(vendorRepository.save(any())).thenReturn(vendor);
        when(vendorItemRepository.findByVendorId(vendorId)).thenReturn(List.of());

        CreateVendorRequest request = new CreateVendorRequest("New Name", null, null, "VEGETABLES", null, null);
        vendorService.update(tenantId, vendorId, request);

        assertEquals("New Name", vendor.getVendorName());
        verify(vendorRepository).save(vendor);
    }

    @Test
    void update_throwsWhenVendorNotFound() {
        when(vendorRepository.findById(vendorId)).thenReturn(Optional.empty());

        CreateVendorRequest request = new CreateVendorRequest("X", null, null, "OTHER", null, null);
        assertThrows(EntityNotFoundException.class, () -> vendorService.update(tenantId, vendorId, request));
    }

    // ─── delete ─────────────────────────────────────────────────────────────────

    @Test
    void delete_removesVendorAndLinkedItems() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);

        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));

        vendorService.delete(tenantId, vendorId);

        verify(vendorRepository).save(vendor);
        assertNotNull(vendor.getDeletedAt());
    }

    // ─── linkInventory ───────────────────────────────────────────────────────────

    @Test
    void linkInventory_createsVendorItemLink() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        UUID inventoryId = UUID.randomUUID();

        Inventory inv = new Inventory();
        setEntityId(inv, inventoryId);
        inv.setTenant(tenant);

        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(inventoryRepository.findById(inventoryId)).thenReturn(Optional.of(inv));
        when(vendorItemRepository.findByVendorIdAndInventoryId(vendorId, inventoryId)).thenReturn(Optional.empty());
        when(vendorItemRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(vendorItemRepository.findByVendorId(vendorId)).thenReturn(List.of());
        when(inventoryRepository.save(any())).thenReturn(inv);

        LinkInventoryToVendorRequest request = new LinkInventoryToVendorRequest(inventoryId, 500L, true);
        vendorService.linkInventory(tenantId, vendorId, request);

        verify(vendorItemRepository).save(any(VendorItem.class));
    }

    @Test
    void linkInventory_throwsWhenInventoryNotFound() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        UUID inventoryId = UUID.randomUUID();

        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(inventoryRepository.findById(inventoryId)).thenReturn(Optional.empty());

        LinkInventoryToVendorRequest request = new LinkInventoryToVendorRequest(inventoryId, null, false);
        assertThrows(EntityNotFoundException.class, () -> vendorService.linkInventory(tenantId, vendorId, request));
    }
}
