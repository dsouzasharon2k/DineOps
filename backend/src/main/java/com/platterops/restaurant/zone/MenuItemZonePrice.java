package com.platterops.restaurant.zone;

import com.platterops.menu.MenuItem;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "menu_item_zone_prices")
public class MenuItemZonePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dining_zone_id", nullable = false)
    private DiningZone diningZone;

    @Column(name = "override_price")
    private Long overridePrice;

    public UUID getId() { return id; }
    public MenuItem getMenuItem() { return menuItem; }
    public void setMenuItem(MenuItem menuItem) { this.menuItem = menuItem; }
    public DiningZone getDiningZone() { return diningZone; }
    public void setDiningZone(DiningZone diningZone) { this.diningZone = diningZone; }
    public Long getOverridePrice() { return overridePrice; }
    public void setOverridePrice(Long overridePrice) { this.overridePrice = overridePrice; }
}
