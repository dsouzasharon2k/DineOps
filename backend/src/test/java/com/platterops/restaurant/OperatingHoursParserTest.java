package com.platterops.restaurant;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OperatingHoursParserTest {

    @Test
    void isOpen_nullOperatingHours_returnsTrue() {
        assertTrue(OperatingHoursParser.isOpen(null, LocalDateTime.now()));
    }

    @Test
    void isOpen_blankOperatingHours_returnsTrue() {
        assertTrue(OperatingHoursParser.isOpen("", LocalDateTime.now()));
        assertTrue(OperatingHoursParser.isOpen("   ", LocalDateTime.now()));
    }

    @Test
    void isOpen_validJson_withinHours_returnsTrue() {
        // Monday 10:00-22:00, Tuesday 10:00-22:00, etc.
        String json = """
            {
              "monday": { "open": "10:00", "close": "22:00" },
              "tuesday": { "open": "10:00", "close": "22:00" },
              "wednesday": { "open": "10:00", "close": "22:00" },
              "thursday": { "open": "10:00", "close": "22:00" },
              "friday": { "open": "10:00", "close": "22:00" },
              "saturday": { "open": "10:00", "close": "22:00" },
              "sunday": { "open": "10:00", "close": "22:00" }
            }
            """;
        // Monday at 14:00 (2 PM) - within 10:00-22:00
        LocalDateTime mondayAfternoon = LocalDateTime.of(2025, 3, 17, 14, 0);
        assertTrue(OperatingHoursParser.isOpen(json, mondayAfternoon));
    }

    @Test
    void isOpen_validJson_outsideHours_returnsFalse() {
        String json = """
            {
              "monday": { "open": "10:00", "close": "22:00" },
              "tuesday": { "open": "10:00", "close": "22:00" },
              "wednesday": { "open": "10:00", "close": "22:00" },
              "thursday": { "open": "10:00", "close": "22:00" },
              "friday": { "open": "10:00", "close": "22:00" },
              "saturday": { "open": "10:00", "close": "22:00" },
              "sunday": { "open": "10:00", "close": "22:00" }
            }
            """;
        // Monday at 03:00 (3 AM) - outside 10:00-22:00
        LocalDateTime mondayEarly = LocalDateTime.of(2025, 3, 17, 3, 0);
        assertFalse(OperatingHoursParser.isOpen(json, mondayEarly));
    }

    @Test
    void isOpen_dayNull_returnsFalse() {
        String json = """
            {
              "monday": null,
              "tuesday": { "open": "10:00", "close": "22:00" },
              "wednesday": { "open": "10:00", "close": "22:00" },
              "thursday": { "open": "10:00", "close": "22:00" },
              "friday": { "open": "10:00", "close": "22:00" },
              "saturday": { "open": "10:00", "close": "22:00" },
              "sunday": { "open": "10:00", "close": "22:00" }
            }
            """;
        // Monday - null means closed
        LocalDateTime monday = LocalDateTime.of(2025, 3, 17, 12, 0);
        assertFalse(OperatingHoursParser.isOpen(json, monday));
    }

    @Test
    void isOpen_midnightCrossover_withinWindow_returnsTrue() {
        // Open 22:00, close 02:00 (next day) - e.g. late night
        String json = """
            {
              "monday": { "open": "22:00", "close": "02:00" },
              "tuesday": { "open": "22:00", "close": "02:00" },
              "wednesday": { "open": "22:00", "close": "02:00" },
              "thursday": { "open": "22:00", "close": "02:00" },
              "friday": { "open": "22:00", "close": "02:00" },
              "saturday": { "open": "22:00", "close": "02:00" },
              "sunday": { "open": "22:00", "close": "02:00" }
            }
            """;
        // Monday 23:00 - after 22:00, before midnight
        LocalDateTime mondayLate = LocalDateTime.of(2025, 3, 17, 23, 0);
        assertTrue(OperatingHoursParser.isOpen(json, mondayLate));
        // Monday 01:00 - after midnight, before 02:00
        LocalDateTime tuesdayEarly = LocalDateTime.of(2025, 3, 18, 1, 0);
        assertTrue(OperatingHoursParser.isOpen(json, tuesdayEarly));
    }

    @Test
    void isOpen_malformedJson_returnsTrue() {
        assertTrue(OperatingHoursParser.isOpen("10:00 - 22:00", LocalDateTime.now()));
        assertTrue(OperatingHoursParser.isOpen("not json", LocalDateTime.now()));
        assertTrue(OperatingHoursParser.isOpen("{ invalid }", LocalDateTime.now()));
    }
}
