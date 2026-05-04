package com.platterops.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record LinkInventoryToVendorRequest(
        @NotNull UUID inventoryId,
        Long lastPurchasePrice,
        boolean preferredVendor
) {}
