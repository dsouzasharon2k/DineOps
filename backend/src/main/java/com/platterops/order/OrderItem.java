package com.dineops.order;

import com.dineops.entity.AuditableEntity;
import com.dineops.menu.MenuItem;
import com.dineops.restaurant.Restaurant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@SQLRestriction("deleted_at IS NULL")
public class OrderItem extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Reference to the parent order
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Reference to the menu item backing this line item
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    // We store name and price as snapshots at time of order
    // This way if the menu item is later deleted or price changes,
    // the order history remains accurate
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer price; // in paise

    @Column(nullable = false)
    private Integer quantity;

    /** Denormalized for analytics; avoids join through orders for "revenue by item for tenant X". */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    private Restaurant tenantRestaurant;

    // Getters and Setters
    public UUID getId() { return id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public MenuItem getMenuItem() { return menuItem; }
    public void setMenuItem(MenuItem menuItem) { this.menuItem = menuItem; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Restaurant getTenantRestaurant() { return tenantRestaurant; }
    public void setTenantRestaurant(Restaurant tenantRestaurant) { this.tenantRestaurant = tenantRestaurant; }
}