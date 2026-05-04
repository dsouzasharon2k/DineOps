package com.platterops.vendor;

import com.platterops.inventory.Inventory;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "vendor_items",
    uniqueConstraints = @UniqueConstraint(columnNames = {"vendor_id", "inventory_id"})
)
public class VendorItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @Column(name = "last_purchase_price")
    private Long lastPurchasePrice;

    @Column(name = "is_preferred_vendor", nullable = false)
    private boolean preferredVendor = false;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UUID getId() { return id; }
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    public Inventory getInventory() { return inventory; }
    public void setInventory(Inventory inventory) { this.inventory = inventory; }
    public Long getLastPurchasePrice() { return lastPurchasePrice; }
    public void setLastPurchasePrice(Long lastPurchasePrice) { this.lastPurchasePrice = lastPurchasePrice; }
    public boolean isPreferredVendor() { return preferredVendor; }
    public void setPreferredVendor(boolean preferredVendor) { this.preferredVendor = preferredVendor; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
