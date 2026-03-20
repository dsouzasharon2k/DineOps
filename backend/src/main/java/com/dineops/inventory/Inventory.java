package com.dineops.inventory;

import com.dineops.entity.AuditableEntity;
import com.dineops.menu.MenuItem;
import com.dineops.restaurant.Restaurant;
import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "inventory")
public class Inventory extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id", nullable = false, unique = true)
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(name = "low_stock_threshold", nullable = false)
    private Integer lowStockThreshold = 5;

    public UUID getId() {
        return id;
    }

    public MenuItem getMenuItem() {
        return menuItem;
    }

    public void setMenuItem(MenuItem menuItem) {
        this.menuItem = menuItem;
    }

    public Restaurant getTenant() {
        return tenant;
    }

    public void setTenant(Restaurant tenant) {
        this.tenant = tenant;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getLowStockThreshold() {
        return lowStockThreshold;
    }

    public void setLowStockThreshold(Integer lowStockThreshold) {
        this.lowStockThreshold = lowStockThreshold;
    }
}
