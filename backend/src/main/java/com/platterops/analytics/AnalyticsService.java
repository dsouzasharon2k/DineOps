package com.platterops.analytics;

import com.platterops.dto.AnalyticsSummaryResponse;
import com.platterops.dto.ActionRecommendationResponse;
import com.platterops.dto.ConversionFunnelResponse;
import com.platterops.dto.CustomerProfileResponse;
import com.platterops.dto.MenuInsightItem;
import com.platterops.dto.MenuInsightsResponse;
import com.platterops.order.Order;
import com.platterops.order.OrderRepository;
import com.platterops.order.OrderStatus;
import com.platterops.order.OrderStatusHistory;
import com.platterops.order.OrderStatusHistoryRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final com.platterops.inventory.WastageRepository wastageRepository;
    private final JdbcTemplate jdbcTemplate;

    public AnalyticsService(OrderRepository orderRepository, 
                            OrderStatusHistoryRepository orderStatusHistoryRepository,
                            com.platterops.inventory.WastageRepository wastageRepository,
                            JdbcTemplate jdbcTemplate) {
        this.orderRepository = orderRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.wastageRepository = wastageRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public AnalyticsSummaryResponse getSummary(UUID tenantId) {
        List<Order> orders = orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        LocalDate referenceDate = LocalDate.now();
        LocalDateTime wastageFromInclusive = referenceDate.minusDays(6).atStartOfDay();
        LocalDateTime wastageToExclusive = referenceDate.plusDays(1).atStartOfDay();
        return summarizeOrders(orders, tenantId, referenceDate, wastageFromInclusive, wastageToExclusive);
    }

    public AnalyticsSummaryResponse getSummary(UUID tenantId, LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        List<Order> orders = orderRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                tenantId,
                fromInclusive,
                toExclusive
        );
        return summarizeOrders(orders, tenantId, toExclusive.toLocalDate().minusDays(1), fromInclusive, toExclusive);
    }

        private AnalyticsSummaryResponse summarizeOrders(
            List<Order> orders,
            UUID tenantId,
            LocalDate referenceDate,
            LocalDateTime wastageFromInclusive,
            LocalDateTime wastageToExclusive
        ) {
        LocalDate today = referenceDate;
        LocalDate windowStart = referenceDate.minusDays(6);
        LocalDate windowEnd = referenceDate;

        long todaysOrderCount = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .count();
        long todaysRevenue = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .mapToLong(order -> order.getTotalAmount() == null ? 0 : order.getTotalAmount())
                .sum();
        
        long todaysCOGS = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .flatMap(order -> order.getItems().stream())
                .mapToLong(item -> {
                    if (item.getCostAtOrder() != null) {
                        return item.getCostAtOrder() * item.getQuantity();
                    }
                    return item.getMenuItem() != null && item.getMenuItem().getBaseCost() != null
                            ? item.getMenuItem().getBaseCost() * item.getQuantity()
                            : 0L;
                })
                .sum();

        List<com.platterops.inventory.Wastage> wastageEvents = wastageRepository
            .findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(tenantId, wastageFromInclusive, wastageToExclusive);
        long todaysWastage = wastageEvents.stream()
                .filter(w -> w.getCreatedAt() != null && w.getCreatedAt().toLocalDate().isEqual(today))
                .mapToLong(w -> w.getUnitCost() * w.getQuantity())
                .sum();

        long todaysExpenses = loadExpenseTotal(tenantId, today, today);
        long todaysProfit = todaysRevenue - todaysCOGS - todaysWastage - todaysExpenses;
        double averageOrderValue = todaysOrderCount == 0 ? 0 : (double) todaysRevenue / todaysOrderCount;

        Map<OrderStatus, Long> statusMap = new EnumMap<>(OrderStatus.class);
        for (OrderStatus status : OrderStatus.values()) {
            statusMap.put(status, 0L);
        }
        for (Order order : orders) {
            statusMap.put(order.getStatus(), statusMap.get(order.getStatus()) + 1);
        }
        List<AnalyticsSummaryResponse.StatusCount> ordersByStatus = Arrays.stream(OrderStatus.values())
                .map(status -> new AnalyticsSummaryResponse.StatusCount(status.name(), statusMap.get(status)))
                .toList();

        Map<LocalDate, Long> revenueByDate = new HashMap<>();
        for (int i = 6; i >= 0; i--) {
            revenueByDate.put(referenceDate.minusDays(i), 0L);
        }
        for (Order order : orders) {
            if (order.getCreatedAt() == null) {
                continue;
            }
            LocalDate date = order.getCreatedAt().toLocalDate();
            if (revenueByDate.containsKey(date)) {
                revenueByDate.put(date, revenueByDate.get(date) + (order.getTotalAmount() == null ? 0 : order.getTotalAmount()));
            }
        }
        List<AnalyticsSummaryResponse.RevenuePoint> revenueTrend = revenueByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new AnalyticsSummaryResponse.RevenuePoint(entry.getKey().toString(), entry.getValue()))
                .toList();

        Map<LocalDate, Long> wastageByDate = new HashMap<>();
        for (int i = 6; i >= 0; i--) {
            wastageByDate.put(referenceDate.minusDays(i), 0L);
        }
        for (com.platterops.inventory.Wastage wastage : wastageEvents) {
            if (wastage.getCreatedAt() == null) {
                continue;
            }
            LocalDate date = wastage.getCreatedAt().toLocalDate();
            if (wastageByDate.containsKey(date)) {
                long value = (long) wastage.getUnitCost() * wastage.getQuantity();
                wastageByDate.put(date, wastageByDate.get(date) + value);
            }
        }
        List<AnalyticsSummaryResponse.RevenuePoint> wastageTrend = wastageByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new AnalyticsSummaryResponse.RevenuePoint(entry.getKey().toString(), entry.getValue()))
                .toList();

        List<AnalyticsSummaryResponse.ItemCount> topMenuItems = loadRevenueWeightedTopItems(tenantId, windowStart, windowEnd, orders);

        double avgPrepMinutes = loadAveragePreparationMinutesFromView(tenantId, windowStart, windowEnd)
                .orElseGet(() -> calculateAveragePreparationMinutes(orders));

        return new AnalyticsSummaryResponse(
                todaysOrderCount,
                todaysRevenue,
                averageOrderValue,
                todaysProfit,
                todaysWastage,
                ordersByStatus,
                revenueTrend,
                wastageTrend,
                topMenuItems,
                avgPrepMinutes
        );
    }

    private List<AnalyticsSummaryResponse.ItemCount> loadRevenueWeightedTopItems(
            UUID tenantId,
            LocalDate fromDate,
            LocalDate toDate,
            List<Order> fallbackOrders
    ) {
        String sql = """
                SELECT item_name, SUM(units_sold)::bigint AS units_sold, SUM(revenue_paise)::bigint AS revenue_paise
                FROM vw_item_revenue
                WHERE tenant_id = ?::uuid
                  AND order_date >= ?::date
                  AND order_date <= ?::date
                GROUP BY item_name
                ORDER BY revenue_paise DESC
                LIMIT 5
                """;
        try {
            return jdbcTemplate.query(
                    sql,
                    (rs, rowNum) -> new AnalyticsSummaryResponse.ItemCount(rs.getString("item_name"), rs.getLong("units_sold")),
                    tenantId.toString(),
                    fromDate,
                    toDate
            );
        } catch (Exception ignored) {
            Map<String, Long> itemRevenueFallback = new HashMap<>();
            Map<String, Long> itemUnitsFallback = new HashMap<>();
            for (Order order : fallbackOrders) {
                order.getItems().forEach(item -> {
                    itemRevenueFallback.merge(item.getName(), (long) item.getPrice() * item.getQuantity(), Long::sum);
                    itemUnitsFallback.merge(item.getName(), (long) item.getQuantity(), Long::sum);
                });
            }
            return itemRevenueFallback.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                    .limit(5)
                    .map(entry -> new AnalyticsSummaryResponse.ItemCount(entry.getKey(), itemUnitsFallback.getOrDefault(entry.getKey(), 0L)))
                    .toList();
        }
    }

    private java.util.Optional<Double> loadAveragePreparationMinutesFromView(UUID tenantId, LocalDate fromDate, LocalDate toDate) {
        String sql = """
                SELECT AVG(prep_minutes) AS avg_prep
                FROM vw_accurate_prep_times
                WHERE tenant_id = ?::uuid
                  AND created_at >= ?::date
                  AND created_at < (?::date + INTERVAL '1 day')
                """;
        try {
            Double value = jdbcTemplate.queryForObject(sql, Double.class, tenantId.toString(), fromDate, toDate);
            if (value == null || value.isNaN()) {
                return java.util.Optional.empty();
            }
            return java.util.Optional.of(value);
        } catch (Exception ignored) {
            return java.util.Optional.empty();
        }
    }

    private long loadExpenseTotal(UUID tenantId, LocalDate fromDate, LocalDate toDate) {
        if (jdbcTemplate == null) {
            return 0L;
        }
        String sql = """
                SELECT COALESCE(SUM(amount), 0)
                FROM expense_entries
                WHERE tenant_id = ?::uuid
                  AND expense_date >= ?::date
                  AND expense_date <= ?::date
                  AND deleted_at IS NULL
                """;
        try {
            Long value = jdbcTemplate.queryForObject(sql, Long.class, tenantId.toString(), fromDate, toDate);
            return value == null ? 0L : value;
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private double calculateAveragePreparationMinutes(List<Order> orders) {
        List<Long> prepTimes = new ArrayList<>();
        List<Long> fallbackDurations = new ArrayList<>();
        for (Order order : orders) {
            List<OrderStatusHistory> history = orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(order.getId());
            LocalDateTime confirmedAt = null;
            LocalDateTime readyAt = null;
            for (OrderStatusHistory item : history) {
                if (item.getNewStatus() == OrderStatus.CONFIRMED && confirmedAt == null) {
                    confirmedAt = item.getChangedAt();
                }
                if (item.getNewStatus() == OrderStatus.READY) {
                    readyAt = item.getChangedAt();
                    break;
                }
            }
            if (confirmedAt != null && readyAt != null && !readyAt.isBefore(confirmedAt)) {
                prepTimes.add(Duration.between(confirmedAt, readyAt).toMinutes());
            }

            // Fallback for demo and historical rows where status history may be missing.
            if ((order.getStatus() == OrderStatus.READY || order.getStatus() == OrderStatus.DELIVERED)
                    && order.getCreatedAt() != null
                    && order.getUpdatedAt() != null
                    && !order.getUpdatedAt().isBefore(order.getCreatedAt())) {
                fallbackDurations.add(Duration.between(order.getCreatedAt(), order.getUpdatedAt()).toMinutes());
            }
        }
        if (prepTimes.isEmpty()) {
            if (fallbackDurations.isEmpty()) {
                return 0;
            }
            return fallbackDurations.stream().mapToLong(Long::longValue).average().orElse(0);
        }
        return prepTimes.stream().mapToLong(Long::longValue).average().orElse(0);
    }

    public MenuInsightsResponse getMenuInsights(UUID tenantId, LocalDate fromDate, LocalDate toDate) {
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusDays(29);
        LocalDate to = toDate != null ? toDate : LocalDate.now();
        if (to.isBefore(from) || jdbcTemplate == null) {
            return new MenuInsightsResponse(List.of(), List.of());
        }

        String sql = """
                SELECT
                    oi.name AS item_name,
                    SUM(oi.quantity)::bigint AS units_sold,
                    SUM((oi.price * oi.quantity)::bigint) AS revenue,
                    SUM((COALESCE(oi.cost_at_order, 0) * oi.quantity)::bigint) AS cogs
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.tenant_id = ?::uuid
                  AND o.created_at >= ?::date
                  AND o.created_at < (?::date + INTERVAL '1 day')
                  AND o.status = 'DELIVERED'
                  AND o.deleted_at IS NULL
                  AND oi.deleted_at IS NULL
                GROUP BY oi.name
                """;

        List<ItemInsightRow> raw = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new ItemInsightRow(
                        rs.getString("item_name"),
                        rs.getLong("units_sold"),
                        rs.getLong("revenue"),
                        rs.getLong("cogs")
                ),
                tenantId.toString(),
                from,
                to
        );

        if (raw.isEmpty()) {
            return new MenuInsightsResponse(List.of(), List.of("No delivered-order data found in selected range."));
        }

        double avgUnits = raw.stream().mapToLong(ItemInsightRow::unitsSold).average().orElse(0);
        double avgMarginPct = raw.stream()
                .mapToDouble(row -> {
                    if (row.revenue() <= 0) {
                        return 0;
                    }
                    return ((double) (row.revenue() - row.cogs()) / row.revenue()) * 100.0;
                })
                .average()
                .orElse(0);

        List<MenuInsightItem> items = raw.stream()
                .map(row -> {
                    long profit = row.revenue() - row.cogs();
                    double marginPct = row.revenue() <= 0 ? 0 : ((double) profit / row.revenue()) * 100.0;
                    boolean highPopularity = row.unitsSold() >= avgUnits;
                    boolean highMargin = marginPct >= avgMarginPct;
                    String quadrant;
                    if (highPopularity && highMargin) {
                        quadrant = "STAR";
                    } else if (highPopularity) {
                        quadrant = "CASH_COW";
                    } else if (highMargin) {
                        quadrant = "TRAP";
                    } else {
                        quadrant = "DOG";
                    }
                    return new MenuInsightItem(
                            row.itemName(),
                            row.unitsSold(),
                            row.revenue(),
                            row.cogs(),
                            profit,
                            Math.round(marginPct * 10.0) / 10.0,
                            quadrant
                    );
                })
                .sorted(Comparator.comparingLong(MenuInsightItem::revenue).reversed())
                .toList();

        long stars = items.stream().filter(item -> "STAR".equals(item.quadrant())).count();
        long cashCows = items.stream().filter(item -> "CASH_COW".equals(item.quadrant())).count();
        long traps = items.stream().filter(item -> "TRAP".equals(item.quadrant())).count();
        long dogs = items.stream().filter(item -> "DOG".equals(item.quadrant())).count();

        List<String> recommendations = new ArrayList<>();
        if (stars > 0) {
            recommendations.add("Promote STAR items in homepage highlights and combos.");
        }
        if (cashCows > 0) {
            recommendations.add("Review portion size or ingredient sourcing for CASH_COW items to improve margins.");
        }
        if (traps > 0) {
            recommendations.add("TRAP items have good margin but low demand: test placement and naming improvements.");
        }
        if (dogs > 0) {
            recommendations.add("DOG items are low popularity and low margin: consider reprice, reformulate, or retire.");
        }
        if (recommendations.isEmpty()) {
            recommendations.add("Menu mix is balanced. Continue tracking over a longer date range for stronger signals.");
        }

        return new MenuInsightsResponse(items, recommendations);
    }

    public List<ActionRecommendationResponse> getActionsToday(UUID tenantId, LocalDate fromDate, LocalDate toDate) {
        LocalDate to = toDate != null ? toDate : LocalDate.now();
        LocalDate from = fromDate != null ? fromDate : to.minusDays(6);
        if (to.isBefore(from)) {
            return List.of();
        }

        AnalyticsSummaryResponse summary = getSummary(tenantId, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        MenuInsightsResponse insights = getMenuInsights(tenantId, from, to);

        List<ActionRecommendationResponse> actions = new ArrayList<>();
        long sevenDayRevenue = summary.revenueTrend().stream().mapToLong(AnalyticsSummaryResponse.RevenuePoint::revenue).sum();
        long sevenDayWastage = summary.wastageTrend().stream().mapToLong(AnalyticsSummaryResponse.RevenuePoint::revenue).sum();

        if (sevenDayWastage > 0) {
            long impact = Math.max(1000L, Math.round(sevenDayWastage * 0.25));
            actions.add(new ActionRecommendationResponse(
                    "Cut high-value wastage this week",
                    "Wastage is materially affecting margins. Focus on top-loss items, tighter prep batching, and end-of-day controls.",
                    impact,
                    "7 days"
            ));
        }

        long traps = insights.items().stream().filter(item -> "TRAP".equals(item.quadrant())).count();
        if (traps > 0) {
            long trapRevenue = insights.items().stream()
                    .filter(item -> "TRAP".equals(item.quadrant()))
                    .mapToLong(MenuInsightItem::revenue)
                    .sum();
            long impact = Math.max(1000L, Math.round(trapRevenue * 0.08));
            actions.add(new ActionRecommendationResponse(
                    "Promote high-margin, low-demand items",
                    "TRAP items have good margins but weak demand. Improve placement, naming, and run combo highlights.",
                    impact,
                    "7-14 days"
            ));
        }

        long dogs = insights.items().stream().filter(item -> "DOG".equals(item.quadrant())).count();
        if (dogs > 0) {
            long dogRevenue = insights.items().stream()
                    .filter(item -> "DOG".equals(item.quadrant()))
                    .mapToLong(MenuInsightItem::revenue)
                    .sum();
            long impact = Math.max(1000L, Math.round(dogRevenue * 0.05));
            actions.add(new ActionRecommendationResponse(
                    "Reprice or retire low-performing items",
                    "DOG items are weak on both demand and margin. Rationalize menu slots and redirect demand to STAR items.",
                    impact,
                    "14 days"
            ));
        }

        if (summary.averageOrderValue() > 0) {
            long upsellImpact = Math.max(1000L, Math.round(sevenDayRevenue * 0.03));
            actions.add(new ActionRecommendationResponse(
                    "Run a focused upsell play",
                    "Train staff/scripts to add one complementary item per order and surface bundle nudges on checkout.",
                    upsellImpact,
                    "7 days"
            ));
        }

        if (actions.size() < 3) {
            long baselineImpact = Math.max(1000L, Math.round(sevenDayRevenue * 0.02));
            actions.add(new ActionRecommendationResponse(
                    "Stabilize prep-time bottlenecks",
                    "Prioritize high-frequency SKUs during peak windows to reduce queue delays and improve table turns.",
                    baselineImpact,
                    "7 days"
            ));
        }

        if (actions.size() < 3) {
            actions.add(new ActionRecommendationResponse(
                    "Keep menu mix under weekly review",
                    "Current signals are limited. Continue tracking daily and compare week-over-week to capture stronger patterns.",
                    1000L,
                    "7 days"
            ));
        }

        return actions.stream().limit(5).toList();
    }

    /**
     * Aggregates orders by customer phone to produce individual customer profiles.
     * Segment logic: NEW = 1-2 orders, REGULAR = 3+ orders within 30 days,
     * SLIPPING = last order > 30 days ago.
     */
    public List<CustomerProfileResponse> getCustomerProfiles(UUID tenantId) {
        String sql = """
                SELECT
                    customer_phone,
                    MAX(customer_name)         AS customer_name,
                    COUNT(*)                   AS total_orders,
                    SUM(total_amount)          AS total_spend,
                    AVG(total_amount)          AS avg_order_value,
                    MAX(created_at)            AS last_order_at
                FROM orders
                WHERE tenant_id     = ?::uuid
                  AND customer_phone IS NOT NULL
                  AND customer_phone != ''
                  AND deleted_at    IS NULL
                  AND status        NOT IN ('CANCELLED')
                GROUP BY customer_phone
                ORDER BY last_order_at DESC
                LIMIT 500
                """;
        try {
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                String phone        = rs.getString("customer_phone");
                String name         = rs.getString("customer_name");
                long   orders       = rs.getLong("total_orders");
                long   spend        = rs.getLong("total_spend");
                double aov          = rs.getDouble("avg_order_value");
                LocalDateTime lastAt = rs.getTimestamp("last_order_at") != null
                        ? rs.getTimestamp("last_order_at").toLocalDateTime()
                        : null;
                long daysSince = lastAt != null
                        ? java.time.temporal.ChronoUnit.DAYS.between(lastAt.toLocalDate(), LocalDate.now())
                        : 9999L;
                String segment;
                if (daysSince > 30) {
                    segment = "SLIPPING";
                } else if (orders <= 2) {
                    segment = "NEW";
                } else {
                    segment = "REGULAR";
                }
                return new CustomerProfileResponse(phone, name, orders, spend, aov, lastAt, daysSince, segment);
            }, tenantId.toString());
        } catch (Exception e) {
            return List.of();
        }
    }

    public void trackProductEvent(UUID tenantId,
                                  ProductEventType eventType,
                                  String sessionId,
                                  UUID orderId,
                                  String source,
                                  String metadata) {
        if (tenantId == null || eventType == null) {
            return;
        }

        String sql = """
                INSERT INTO product_events (tenant_id, event_type, session_id, order_id, source, metadata)
                VALUES (?::uuid, ?, ?, ?::uuid, ?, CAST(? AS jsonb))
                """;

        String safeSessionId = trimToNull(limit(sessionId, 120));
        String safeSource = trimToNull(limit(source, 40));
        if (safeSource == null) {
            safeSource = "web";
        }
        String safeMetadata = trimToNull(metadata);
        if (safeMetadata == null) {
            safeMetadata = "{}";
        }

        try {
            jdbcTemplate.update(
                    sql,
                    tenantId.toString(),
                    eventType.name(),
                    safeSessionId,
                    orderId != null ? orderId.toString() : null,
                    safeSource,
                    safeMetadata
            );
        } catch (Exception ignored) {
            // Analytics tracking should never break product flows.
        }
    }

    public ConversionFunnelResponse getConversionFunnel(UUID tenantId, int days) {
        int safeDays = Math.max(1, Math.min(days, 90));
        LocalDateTime fromInclusive = LocalDateTime.now().minus(safeDays, ChronoUnit.DAYS);

        long menuViews = countProductEvents(tenantId, ProductEventType.MENU_VIEW, fromInclusive);
        long checkoutStarts = countProductEvents(tenantId, ProductEventType.CHECKOUT_START, fromInclusive);
        long paymentsInitiated = countProductEvents(tenantId, ProductEventType.PAYMENT_INITIATED, fromInclusive);

        long ordersPlaced = countOrdersPlaced(tenantId, fromInclusive);
        long paymentsSucceeded = countPaidOrders(tenantId, fromInclusive);

        return new ConversionFunnelResponse(
                safeDays,
                menuViews,
                checkoutStarts,
                ordersPlaced,
                paymentsInitiated,
                paymentsSucceeded,
                pct(checkoutStarts, menuViews),
                pct(ordersPlaced, checkoutStarts),
                pct(paymentsSucceeded, ordersPlaced)
        );
    }

    private long countProductEvents(UUID tenantId, ProductEventType eventType, LocalDateTime fromInclusive) {
        String sql = """
                SELECT COALESCE(COUNT(*), 0)
                FROM product_events
                WHERE tenant_id = ?::uuid
                  AND event_type = ?
                  AND created_at >= ?
                """;
        try {
            Long value = jdbcTemplate.queryForObject(sql, Long.class, tenantId.toString(), eventType.name(), fromInclusive);
            return value == null ? 0L : value;
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private long countOrdersPlaced(UUID tenantId, LocalDateTime fromInclusive) {
        String sql = """
                SELECT COALESCE(COUNT(*), 0)
                FROM orders
                WHERE tenant_id = ?::uuid
                  AND created_at >= ?
                  AND deleted_at IS NULL
                  AND status <> 'CANCELLED'
                """;
        try {
            Long value = jdbcTemplate.queryForObject(sql, Long.class, tenantId.toString(), fromInclusive);
            return value == null ? 0L : value;
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private long countPaidOrders(UUID tenantId, LocalDateTime fromInclusive) {
        String sql = """
                SELECT COALESCE(COUNT(*), 0)
                FROM orders
                WHERE tenant_id = ?::uuid
                  AND created_at >= ?
                  AND deleted_at IS NULL
                  AND payment_status = 'PAID'
                """;
        try {
            Long value = jdbcTemplate.queryForObject(sql, Long.class, tenantId.toString(), fromInclusive);
            return value == null ? 0L : value;
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private double pct(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0.0;
        }
        return Math.round(((double) numerator * 1000.0) / (double) denominator) / 10.0;
    }

    private String limit(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record ItemInsightRow(String itemName, long unitsSold, long revenue, long cogs) {
    }
}
