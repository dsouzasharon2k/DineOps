package com.platterops.table;

import com.platterops.entity.AuditableEntity;
import com.platterops.restaurant.Restaurant;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "dining_tables", uniqueConstraints = {
        @UniqueConstraint(name = "uk_dining_tables_tenant_table_number", columnNames = {"tenant_id", "table_number"})
})
@SQLRestriction("deleted_at IS NULL")
public class DiningTable extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    @Column(name = "table_number", nullable = false)
    private String tableNumber;

    @Column(nullable = false)
    private Integer capacity = 2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DiningTableStatus status = DiningTableStatus.AVAILABLE;

    @Column(name = "qr_code_url")
    private String qrCodeUrl;

    public UUID getId() { return id; }
    public Restaurant getTenant() { return tenant; }
    public void setTenant(Restaurant tenant) { this.tenant = tenant; }
    public String getTableNumber() { return tableNumber; }
    public void setTableNumber(String tableNumber) { this.tableNumber = tableNumber; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public DiningTableStatus getStatus() { return status; }
    public void setStatus(DiningTableStatus status) { this.status = status; }
    public String getQrCodeUrl() { return qrCodeUrl; }
    public void setQrCodeUrl(String qrCodeUrl) { this.qrCodeUrl = qrCodeUrl; }
}
