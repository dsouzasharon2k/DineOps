package com.platterops.vendor;

import com.platterops.entity.AuditableEntity;
import com.platterops.restaurant.Restaurant;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "vendors")
@SQLRestriction("deleted_at IS NULL")
public class Vendor extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    @Column(name = "vendor_name", nullable = false)
    private String vendorName;

    @Column(name = "contact_person")
    private String contactPerson;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "category", nullable = false)
    private String category = "OTHER";

    @Column(name = "address")
    private String address;

    @Column(name = "notes")
    private String notes;

    @OneToMany(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VendorItem> items = new ArrayList<>();

    public UUID getId() { return id; }
    public Restaurant getTenant() { return tenant; }
    public void setTenant(Restaurant tenant) { this.tenant = tenant; }
    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }
    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category == null ? "OTHER" : category; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public List<VendorItem> getItems() { return items; }
}
