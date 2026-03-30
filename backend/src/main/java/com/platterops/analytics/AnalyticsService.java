package com.platterops.analytics;

import com.platterops.dto.AnalyticsSummaryResponse;
import com.platterops.order.Order;
import com.platterops.order.OrderRepository;
import com.platterops.order.OrderStatus;
import com.platterops.order.OrderStatusHistory;
import com.platterops.order.OrderStatusHistoryRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
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

    public AnalyticsService(OrderRepository orderRepository, OrderStatusHistoryRepository orderStatusHistoryRepository) {
        this.orderRepository = orderRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
    }

    public AnalyticsSummaryResponse getSummary(UUID tenantId) {
        List<Order> orders = orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        LocalDate today = LocalDate.now();

        long todaysOrderCount = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .count();
        long todaysRevenue = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .mapToLong(order -> order.getTotalAmount() == null ? 0 : order.getTotalAmount())
                .sum();
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
            revenueByDate.put(today.minusDays(i), 0L);
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

        Map<String, Long> itemCountMap = new HashMap<>();
        for (Order order : orders) {
            order.getItems().forEach(item -> itemCountMap.merge(item.getName(), (long) item.getQuantity(), (a, b) -> a + b));
        }
        List<AnalyticsSummaryResponse.ItemCount> topMenuItems = itemCountMap.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .map(entry -> new AnalyticsSummaryResponse.ItemCount(entry.getKey(), entry.getValue()))
                .toList();

        double avgPrepMinutes = calculateAveragePreparationMinutes(orders);

        return new AnalyticsSummaryResponse(
                todaysOrderCount,
                todaysRevenue,
                averageOrderValue,
                ordersByStatus,
                revenueTrend,
                topMenuItems,
                avgPrepMinutes
        );
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
}
