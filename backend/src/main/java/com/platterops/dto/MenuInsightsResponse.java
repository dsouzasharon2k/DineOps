package com.platterops.dto;

import java.util.List;

public record MenuInsightsResponse(
        List<MenuInsightItem> items,
        List<String> recommendations
) {
}
