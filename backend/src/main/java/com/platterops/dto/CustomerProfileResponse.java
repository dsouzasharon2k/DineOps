package com.platterops.dto;

import java.time.LocalDateTime;

public record CustomerProfileResponse(
        String customerPhone,
        String customerName,
        long totalOrders,
        long totalSpendPaise,
        double avgOrderValuePaise,
        LocalDateTime lastOrderAt,
        long daysSinceLastOrder,
        String segment
) {}
