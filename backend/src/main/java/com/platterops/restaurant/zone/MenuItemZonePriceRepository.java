package com.platterops.restaurant.zone;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface MenuItemZonePriceRepository extends JpaRepository<MenuItemZonePrice, UUID> {
    Optional<MenuItemZonePrice> findByMenuItemIdAndDiningZoneId(UUID menuItemId, UUID diningZoneId);
}
