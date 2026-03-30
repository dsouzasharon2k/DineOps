package com.platterops.dto;

import java.util.UUID;

public record KitchenBatchResponse(
    UUID menuItemId,
    String itemName,
    long totalQuantity,
    long orderCount,
    double priority,
    long maxWaitMinutes
) {}
