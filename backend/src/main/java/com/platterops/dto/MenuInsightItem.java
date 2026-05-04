package com.platterops.dto;

public record MenuInsightItem(
        String itemName,
        long unitsSold,
        long revenue,
        long cogs,
        long profit,
        double marginPct,
        String quadrant
) {
}
