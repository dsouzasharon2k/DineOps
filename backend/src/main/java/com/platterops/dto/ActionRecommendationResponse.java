package com.platterops.dto;

public record ActionRecommendationResponse(
        String title,
        String rationale,
        long estimatedImpactPaise,
        String impactWindow
) {
}
