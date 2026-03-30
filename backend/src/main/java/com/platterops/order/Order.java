package com.dineops.order;

import com.dineops.entity.AuditableEntity;
import com.dineops.restaurant.Restaurant;
import com.dineops.table.DiningTable;
import com.dineops.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@SQLRestriction("deleted_at IS NULL")
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

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "customer_email")
    private String customerEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private DiningTable table;

    /** Raw table number from QR/manual entry; persisted even when dining_tables row doesn't exist. */
    @Column(name = "table_number", length = 50)
    private String tableNumber;

    /** When set, customer_name/phone/email have been erased for GDPR/retention. */
    @Column(name = "customer_data_erased_at")
    private java.time.LocalDateTime customerDataErasedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Column(name = "payment_provider_order_ref")
    private String paymentProviderOrderRef;

    @Column(name = "payment_provider_payment_ref")
    private String paymentProviderPaymentRef;

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
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public DiningTable getTable() { return table; }
    public void setTable(DiningTable table) { this.table = table; }
    public String getTableNumber() { return tableNumber; }
    public void setTableNumber(String tableNumber) { this.tableNumber = tableNumber; }
    public java.time.LocalDateTime getCustomerDataErasedAt() { return customerDataErasedAt; }
    public void setCustomerDataErasedAt(java.time.LocalDateTime customerDataErasedAt) { this.customerDataErasedAt = customerDataErasedAt; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentProviderOrderRef() { return paymentProviderOrderRef; }
    public void setPaymentProviderOrderRef(String paymentProviderOrderRef) { this.paymentProviderOrderRef = paymentProviderOrderRef; }
    public String getPaymentProviderPaymentRef() { return paymentProviderPaymentRef; }
    public void setPaymentProviderPaymentRef(String paymentProviderPaymentRef) { this.paymentProviderPaymentRef = paymentProviderPaymentRef; }
    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
}