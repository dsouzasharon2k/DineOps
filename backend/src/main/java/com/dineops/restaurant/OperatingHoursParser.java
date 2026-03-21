package com.dineops.restaurant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Parses restaurant operating hours from JSON and checks if the restaurant is open at a given time.
 * <p>
 * Expected JSON format (day names lowercase):
 * <pre>
 * {
 *   "monday":    { "open": "09:00", "close": "22:00" },
 *   "tuesday":   { "open": "09:00", "close": "22:00" },
 *   "wednesday": null,
 *   ...
 * }
 * </pre>
 * - null or absent day = closed that day
 * - null/blank operatingHours = always open (backward compatible)
 * - Malformed JSON = treated as always open (backward compatible with legacy free-form text)
 * - Handles midnight crossover: close "02:00" with open "22:00" = open until 2 AM next day
 */
public final class OperatingHoursParser {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String[] DAY_NAMES = {
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    };

    private OperatingHoursParser() {
    }

    /**
     * Returns true if the restaurant is open at the given time.
     * Returns true when operatingHours is null, blank, or unparseable (backward compatible).
     */
    public static boolean isOpen(String operatingHours, LocalDateTime when) {
        if (operatingHours == null || operatingHours.isBlank()) {
            return true;
        }
        try {
            JsonNode root = JSON.readTree(operatingHours);
            if (root == null || !root.isObject()) {
                return true;
            }
            String dayKey = DAY_NAMES[when.getDayOfWeek().getValue() - 1];
            JsonNode dayNode = root.get(dayKey);
            if (dayNode == null || dayNode.isNull()) {
                return false;
            }
            JsonNode openNode = dayNode.get("open");
            JsonNode closeNode = dayNode.get("close");
            if (openNode == null || closeNode == null || !openNode.isTextual() || !closeNode.isTextual()) {
                return false;
            }
            LocalTime open = LocalTime.parse(openNode.asText());
            LocalTime close = LocalTime.parse(closeNode.asText());
            LocalTime now = when.toLocalTime();

            if (close.equals(open)) {
                return true; // 24-hour day
            }
            if (close.isAfter(open)) {
                return !now.isBefore(open) && now.isBefore(close);
            }
            // Midnight crossover: open 22:00, close 02:00
            return !now.isBefore(open) || now.isBefore(close);
        } catch (Exception e) {
            return true; // Malformed or legacy free-form text: treat as always open
        }
    }
}
