package com.dineops.dto;

import java.util.List;

public record AnalyticsSummaryResponse(
        long todaysOrderCount,
        long todaysRevenue,
        double averageOrderValue,
        List<StatusCount> ordersByStatus,
        List<RevenuePoint> revenueTrend,
        List<ItemCount> topMenuItems,
        double averagePreparationMinutes
) {
    public record StatusCount(String status, long count) {}
    public record RevenuePoint(String date, long revenue) {}
    public record ItemCount(String name, long count) {}
}
