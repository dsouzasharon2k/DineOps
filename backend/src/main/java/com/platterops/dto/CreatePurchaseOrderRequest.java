package com.platterops.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseOrderRequest(
        @NotNull UUID vendorId,
        String notes,
        @NotEmpty List<POItemRequest> items
) {
    public record POItemRequest(
            UUID inventoryId,
            @NotNull String itemName,
            @NotNull BigDecimal quantity,
            String unit,
            @NotNull Long unitPrice
    ) {}
}
