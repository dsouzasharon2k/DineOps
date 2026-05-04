package com.platterops.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record VendorResponse(
        UUID id,
        UUID tenantId,
        String vendorName,
        String contactPerson,
        String phoneNumber,
        String category,
        String address,
        String notes,
        List<VendorItemDetail> linkedItems,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record VendorItemDetail(
            UUID vendorItemId,
            UUID inventoryId,
            String menuItemName,
            String unit,
            Long lastPurchasePrice,
            boolean preferredVendor
    ) {}
}
