package com.dineops.restaurant;

import com.dineops.entity.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "restaurants")
public class Restaurant extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String slug;

    private String address;
    private String phone;

    @Column(name = "cuisine_type")
    private String cuisineType;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "fssai_license", length = 20)
    private String fssaiLicense;

    @Column(name = "gst_number", length = 20)
    private String gstNumber;

    @Column(name = "operating_hours", columnDefinition = "TEXT")
    private String operatingHours;

    @Column(name = "notify_customer_email", nullable = false)
    private boolean notifyCustomerEmail = true;

    @Column(name = "notify_customer_sms", nullable = false)
    private boolean notifyCustomerSms = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RestaurantStatus status = RestaurantStatus.PENDING;

    // Getters and Setters
    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCuisineType() { return cuisineType; }
    public void setCuisineType(String cuisineType) { this.cuisineType = cuisineType; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getFssaiLicense() { return fssaiLicense; }
    public void setFssaiLicense(String fssaiLicense) { this.fssaiLicense = fssaiLicense; }
    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }
    public String getOperatingHours() { return operatingHours; }
    public void setOperatingHours(String operatingHours) { this.operatingHours = operatingHours; }
    public boolean isNotifyCustomerEmail() { return notifyCustomerEmail; }
    public void setNotifyCustomerEmail(boolean notifyCustomerEmail) { this.notifyCustomerEmail = notifyCustomerEmail; }
    public boolean isNotifyCustomerSms() { return notifyCustomerSms; }
    public void setNotifyCustomerSms(boolean notifyCustomerSms) { this.notifyCustomerSms = notifyCustomerSms; }
    public RestaurantStatus getStatus() { return status; }
    public void setStatus(RestaurantStatus status) { this.status = status; }
}