package com.dineops.order;

import com.dineops.entity.AuditableEntity;
import com.dineops.restaurant.Restaurant;
import com.dineops.user.User;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // The restaurant this order belongs to (tenant isolation)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    // The customer who placed the order (optional - could be a walk-in)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    // Order status moves through the lifecycle defined in OrderStatus enum
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    // Total stored in paise - sum of (price * quantity) for all order items
    @Column(name = "total_amount", nullable = false)
    private Integer totalAmount;

    private String notes;

    // One order has many order items - cascade means items are saved with the order
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    // Getters and Setters
    public UUID getId() { return id; }
    public Restaurant getTenant() { return tenant; }
    public void setTenant(Restaurant tenant) { this.tenant = tenant; }
    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public Integer getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Integer totalAmount) { this.totalAmount = totalAmount; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
}