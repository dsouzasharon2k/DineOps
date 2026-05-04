package com.platterops.vendor;

import com.platterops.dto.CreatePurchaseOrderRequest;
import com.platterops.dto.PurchaseOrderResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.inventory.Inventory;
import com.platterops.inventory.InventoryRepository;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PurchaseOrderServiceTest {

    private static void setEntityId(Object entity, UUID id) {
        try {
            java.lang.reflect.Field idField = entity.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
    }

    private PurchaseOrderRepository purchaseOrderRepository;
    private VendorRepository vendorRepository;
    private RestaurantRepository restaurantRepository;
    private InventoryRepository inventoryRepository;
    private VendorItemRepository vendorItemRepository;
    private PurchaseOrderService purchaseOrderService;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID vendorId = UUID.randomUUID();
    private final UUID poId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        purchaseOrderRepository = mock(PurchaseOrderRepository.class);
        vendorRepository = mock(VendorRepository.class);
        restaurantRepository = mock(RestaurantRepository.class);
        inventoryRepository = mock(InventoryRepository.class);
        vendorItemRepository = mock(VendorItemRepository.class);
        purchaseOrderService = new PurchaseOrderService(
                purchaseOrderRepository, vendorRepository, restaurantRepository,
                inventoryRepository, vendorItemRepository
        );
    }

    private Restaurant mockRestaurant() {
        Restaurant r = new Restaurant();
        setEntityId(r, tenantId);
        r.setName("Dhaba One");
        return r;
    }

    private Vendor mockVendor(Restaurant tenant) {
        Vendor v = new Vendor();
        setEntityId(v, vendorId);
        v.setTenant(tenant);
        v.setVendorName("Pooja Suppliers");
        return v;
    }

    private PurchaseOrder mockPO(Restaurant tenant, Vendor vendor, String status) {
        PurchaseOrder po = new PurchaseOrder();
        setEntityId(po, poId);
        po.setTenant(tenant);
        po.setVendor(vendor);
        po.setStatus(status);
        po.setTotalAmount(5000L);
        po.setItems(new ArrayList<>());
        return po;
    }

    // ─── create ─────────────────────────────────────────────────────────────────

    @Test
    void create_savesNewDraftPO() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);

        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(purchaseOrderRepository.save(any())).thenAnswer(i -> {
            PurchaseOrder po = i.getArgument(0);
            setEntityId(po, UUID.randomUUID());
            return po;
        });
        when(inventoryRepository.findById(any())).thenReturn(Optional.empty());

        CreatePurchaseOrderRequest.POItemRequest item =
                new CreatePurchaseOrderRequest.POItemRequest(null, "Tomatoes", BigDecimal.valueOf(10), "kg", 500L);
        CreatePurchaseOrderRequest request =
                new CreatePurchaseOrderRequest(vendorId, "Urgent delivery", List.of(item));

        PurchaseOrderResponse result = purchaseOrderService.create(tenantId, request);

        assertNotNull(result);
        assertEquals("DRAFT", result.status());
        verify(purchaseOrderRepository).save(any(PurchaseOrder.class));
    }

    @Test
    void create_throwsWhenTenantNotFound() {
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.empty());

        CreatePurchaseOrderRequest.POItemRequest item =
                new CreatePurchaseOrderRequest.POItemRequest(null, "Rice", BigDecimal.ONE, "kg", 1000L);
        CreatePurchaseOrderRequest request = new CreatePurchaseOrderRequest(vendorId, null, List.of(item));

        assertThrows(EntityNotFoundException.class, () -> purchaseOrderService.create(tenantId, request));
        verify(purchaseOrderRepository, never()).save(any());
    }

    @Test
    void create_throwsWhenVendorNotFound() {
        Restaurant tenant = mockRestaurant();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(vendorRepository.findById(vendorId)).thenReturn(Optional.empty());

        CreatePurchaseOrderRequest.POItemRequest item =
                new CreatePurchaseOrderRequest.POItemRequest(null, "Oil", BigDecimal.ONE, "ltr", 200L);
        CreatePurchaseOrderRequest request = new CreatePurchaseOrderRequest(vendorId, null, List.of(item));

        assertThrows(EntityNotFoundException.class, () -> purchaseOrderService.create(tenantId, request));
    }

    @Test
    void create_throwsWhenVendorBelongsToDifferentTenant() {
        Restaurant tenant = mockRestaurant();
        Restaurant otherTenant = new Restaurant();
        setEntityId(otherTenant, UUID.randomUUID());

        Vendor vendor = new Vendor();
        setEntityId(vendor, vendorId);
        vendor.setTenant(otherTenant); // wrong tenant

        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(vendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));

        CreatePurchaseOrderRequest.POItemRequest item =
                new CreatePurchaseOrderRequest.POItemRequest(null, "Sugar", BigDecimal.ONE, "kg", 100L);
        CreatePurchaseOrderRequest request = new CreatePurchaseOrderRequest(vendorId, null, List.of(item));

        assertThrows(IllegalArgumentException.class, () -> purchaseOrderService.create(tenantId, request));
    }

    // ─── updateStatus ────────────────────────────────────────────────────────────

    @Test
    void updateStatus_draftToSent_succeeds() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        PurchaseOrder po = mockPO(tenant, vendor, "DRAFT");

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderRepository.save(any())).thenReturn(po);

        PurchaseOrderResponse result = purchaseOrderService.updateStatus(tenantId, poId, "SENT");

        assertEquals("SENT", result.status());
        verify(purchaseOrderRepository).save(po);
    }

    @Test
    void updateStatus_sentToReceived_restocksInventory() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        PurchaseOrder po = mockPO(tenant, vendor, "SENT");

        // Add an item linked to inventory
        UUID inventoryId = UUID.randomUUID();
        Inventory inv = new Inventory();
        setEntityId(inv, inventoryId);
        inv.setQuantity(5);

        PurchaseOrderItem lineItem = new PurchaseOrderItem();
        lineItem.setInventory(inv);
        lineItem.setQuantity(BigDecimal.TEN);
        lineItem.setUnitPrice(500L);
        po.getItems().add(lineItem);

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderRepository.save(any())).thenReturn(po);
        when(inventoryRepository.save(any())).thenReturn(inv);
        when(vendorItemRepository.findByVendorIdAndInventoryId(vendorId, inventoryId))
                .thenReturn(Optional.empty());

        purchaseOrderService.updateStatus(tenantId, poId, "RECEIVED");

        // Inventory should be restocked: 5 + 10 = 15
        assertEquals(15, inv.getQuantity());
        verify(inventoryRepository).save(inv);
    }

    @Test
    void updateStatus_receivedPO_cannotBeChangedAgain() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        PurchaseOrder po = mockPO(tenant, vendor, "RECEIVED");

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        assertThrows(IllegalStateException.class,
                () -> purchaseOrderService.updateStatus(tenantId, poId, "SENT"));
    }

    @Test
    void updateStatus_cancelledPO_cannotBeChangedAgain() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        PurchaseOrder po = mockPO(tenant, vendor, "CANCELLED");

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        assertThrows(IllegalStateException.class,
                () -> purchaseOrderService.updateStatus(tenantId, poId, "SENT"));
    }

    @Test
    void updateStatus_throwsWhenPOBelongsToDifferentTenant() {
        Restaurant otherTenant = new Restaurant();
        setEntityId(otherTenant, UUID.randomUUID());
        Vendor vendor = mockVendor(otherTenant);
        PurchaseOrder po = mockPO(otherTenant, vendor, "DRAFT");

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        assertThrows(IllegalArgumentException.class,
                () -> purchaseOrderService.updateStatus(tenantId, poId, "SENT"));
    }

    // ─── getByTenant ─────────────────────────────────────────────────────────────

    @Test
    void getByTenant_returnsPOListOrderedByCreatedAt() {
        Restaurant tenant = mockRestaurant();
        Vendor vendor = mockVendor(tenant);
        PurchaseOrder po1 = mockPO(tenant, vendor, "DRAFT");
        PurchaseOrder po2 = mockPO(tenant, vendor, "SENT");

        when(purchaseOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId))
                .thenReturn(List.of(po1, po2));

        List<PurchaseOrderResponse> result = purchaseOrderService.getByTenant(tenantId);

        assertEquals(2, result.size());
        assertEquals("DRAFT", result.get(0).status());
        assertEquals("SENT", result.get(1).status());
    }
}
