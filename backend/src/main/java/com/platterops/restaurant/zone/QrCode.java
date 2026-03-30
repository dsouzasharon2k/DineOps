package com.platterops.restaurant.zone;

import com.platterops.restaurant.Restaurant;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qr_codes")
public class QrCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dining_zone_id", nullable = false)
    private DiningZone diningZone;

    @Column(name = "table_number")
    private Integer tableNumber;

    @Column(name = "source_identifier", unique = true)
    private String sourceIdentifier;

    @Column(name = "template_name")
    private String templateName;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public UUID getId() { return id; }
    public Restaurant getTenant() { return tenant; }
    public void setTenant(Restaurant tenant) { this.tenant = tenant; }
    public DiningZone getDiningZone() { return diningZone; }
    public void setDiningZone(DiningZone diningZone) { this.diningZone = diningZone; }
    public Integer getTableNumber() { return tableNumber; }
    public void setTableNumber(Integer tableNumber) { this.tableNumber = tableNumber; }
    public String getSourceIdentifier() { return sourceIdentifier; }
    public void setSourceIdentifier(String sourceIdentifier) { this.sourceIdentifier = sourceIdentifier; }
    public String getTemplateName() { return templateName; }
    public void setTemplateName(String templateName) { this.templateName = templateName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
