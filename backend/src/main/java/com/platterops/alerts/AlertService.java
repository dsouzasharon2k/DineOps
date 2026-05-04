package com.platterops.alerts;

import com.platterops.dto.AlertResponse;
import com.platterops.inventory.Wastage;
import com.platterops.inventory.WastageRepository;
import com.platterops.order.Order;
import com.platterops.order.OrderRepository;
import com.platterops.order.OrderStatus;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AlertService {

    private static final double WASTAGE_SPIKE_MULTIPLIER = 1.5;
    private static final int BACKLOG_THRESHOLD = 20;
    private static final int PREP_DELAY_THRESHOLD_MINUTES = 35;
        private static final Set<String> MANAGED_SIGNAL_TYPES = Set.of(
            "WASTAGE_SPIKE",
            "KITCHEN_BACKLOG",
            "PREP_DELAY"
        );

    private final WastageRepository wastageRepository;
    private final OrderRepository orderRepository;
    private final AlertRecordRepository alertRecordRepository;
    private final RestaurantRepository restaurantRepository;

    public AlertService(WastageRepository wastageRepository,
                        OrderRepository orderRepository,
                        AlertRecordRepository alertRecordRepository,
                        RestaurantRepository restaurantRepository) {
        this.wastageRepository = wastageRepository;
        this.orderRepository = orderRepository;
        this.alertRecordRepository = alertRecordRepository;
        this.restaurantRepository = restaurantRepository;
    }

    @Transactional
    public List<AlertResponse> getAlerts(UUID tenantId) {
        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        List<AlertSignal> signals = new ArrayList<>();
        LocalDate today = LocalDate.now();

        appendWastageSpikeAlert(signals, tenantId, today);
        appendBacklogAlert(signals, tenantId, today);
        appendPrepDelayAlert(signals, tenantId, today);

        for (AlertSignal signal : signals) {
            upsertSignal(tenantId, tenant, signal);
        }

        resolveInactiveSignals(tenantId, signals);

        List<AlertRecord> persisted = alertRecordRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        if (persisted.isEmpty()) {
            return List.of(new AlertResponse(
                    null,
                    "INFO",
                    "NO_ACTIVE_ALERTS",
                    "No critical alerts",
                    "All monitored signals are within expected range.",
                    "Continue daily monitoring.",
                    false,
                    LocalDateTime.now()
            ));
        }

        return persisted.stream().map(this::toResponse).toList();
    }

    @Transactional
    public AlertResponse markAsRead(UUID tenantId, UUID alertId) {
        AlertRecord alert = alertRecordRepository.findByIdAndTenantId(alertId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found"));

        if (!alert.isRead()) {
            alert.setRead(true);
            alert.setReadAt(LocalDateTime.now());
            alertRecordRepository.save(alert);
        }

        return toResponse(alert);
    }

    public int getUnreadCount(UUID tenantId) {
        return Math.toIntExact(alertRecordRepository.countByTenantIdAndIsReadFalse(tenantId));
    }

    @Transactional
    public int markAllAsRead(UUID tenantId) {
        List<AlertRecord> unreadAlerts = alertRecordRepository.findByTenantIdAndIsReadFalseOrderByCreatedAtDesc(tenantId);
        if (unreadAlerts.isEmpty()) {
            return 0;
        }

        LocalDateTime now = LocalDateTime.now();
        for (AlertRecord alert : unreadAlerts) {
            alert.setRead(true);
            alert.setReadAt(now);
        }
        alertRecordRepository.saveAll(unreadAlerts);
        return unreadAlerts.size();
    }

    private void upsertSignal(UUID tenantId, Restaurant tenant, AlertSignal signal) {
        AlertRecord existing = alertRecordRepository
                .findTopByTenantIdAndTypeAndIsReadFalseOrderByCreatedAtDesc(tenantId, signal.type())
                .orElse(null);

        if (existing != null && existing.getCreatedAt() != null
                && existing.getCreatedAt().toLocalDate().isEqual(LocalDate.now())) {
            existing.setSeverity(signal.severity());
            existing.setTitle(signal.title());
            existing.setMessage(signal.description());
            existing.setActionHint(signal.action());
            alertRecordRepository.save(existing);
            return;
        }

        AlertRecord record = new AlertRecord();
        record.setTenant(tenant);
        record.setSeverity(signal.severity());
        record.setType(signal.type());
        record.setTitle(signal.title());
        record.setMessage(signal.description());
        record.setActionHint(signal.action());
        alertRecordRepository.save(record);
    }

    private void resolveInactiveSignals(UUID tenantId, List<AlertSignal> activeSignals) {
        Set<String> activeTypes = activeSignals.stream().map(AlertSignal::type).collect(java.util.stream.Collectors.toSet());
        List<AlertRecord> unreadAlerts = alertRecordRepository.findByTenantIdAndIsReadFalseOrderByCreatedAtDesc(tenantId);
        List<AlertRecord> staleAlerts = unreadAlerts.stream()
                .filter(alert -> MANAGED_SIGNAL_TYPES.contains(alert.getType()))
                .filter(alert -> !activeTypes.contains(alert.getType()))
                .toList();

        if (staleAlerts.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (AlertRecord stale : staleAlerts) {
            stale.setRead(true);
            stale.setReadAt(now);
        }
        alertRecordRepository.saveAll(staleAlerts);
    }

    private AlertResponse toResponse(AlertRecord record) {
        return new AlertResponse(
                record.getId(),
                record.getSeverity(),
                record.getType(),
                record.getTitle(),
                record.getMessage(),
                record.getActionHint(),
                record.isRead(),
                record.getCreatedAt()
        );
    }

    private void appendWastageSpikeAlert(List<AlertSignal> alerts, UUID tenantId, LocalDate today) {
        LocalDateTime from = today.minusDays(6).atStartOfDay();
        LocalDateTime to = today.plusDays(1).atStartOfDay();
        List<Wastage> events = wastageRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(tenantId, from, to);

        long todayWastage = events.stream()
                .filter(event -> event.getCreatedAt() != null && event.getCreatedAt().toLocalDate().isEqual(today))
                .mapToLong(event -> (long) event.getUnitCost() * event.getQuantity())
                .sum();

        long historicalWastage = events.stream()
                .filter(event -> event.getCreatedAt() != null && event.getCreatedAt().toLocalDate().isBefore(today))
                .mapToLong(event -> (long) event.getUnitCost() * event.getQuantity())
                .sum();

        double baseline = historicalWastage / 6.0;
        if (baseline > 0 && todayWastage > baseline * WASTAGE_SPIKE_MULTIPLIER) {
            alerts.add(new AlertSignal(
                    "WARNING",
                "WASTAGE_SPIKE",
                    "Wastage spike detected",
                    "Today's wastage is significantly above the trailing 6-day baseline.",
                    "Review top wasted items and adjust prep batches immediately."
            ));
        }
    }

        private void appendBacklogAlert(List<AlertSignal> alerts, UUID tenantId, LocalDate today) {
        List<Order> orders = orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        long activeCount = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .filter(order -> order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.CONFIRMED)
                .count();

        if (activeCount > BACKLOG_THRESHOLD) {
            alerts.add(new AlertSignal(
                    "WARNING",
                "KITCHEN_BACKLOG",
                    "Kitchen backlog risk",
                    "High number of pending/confirmed orders may impact service speed.",
                    "Reassign staff and prioritize oldest pending tickets first."
            ));
        }
    }

        private void appendPrepDelayAlert(List<AlertSignal> alerts, UUID tenantId, LocalDate today) {
        List<Order> orders = orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        long delayedOrders = orders.stream()
                .filter(order -> order.getCreatedAt() != null && order.getCreatedAt().toLocalDate().isEqual(today))
                .filter(order -> order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.CONFIRMED)
                .filter(order -> {
                    if (order.getCreatedAt() == null) {
                        return false;
                    }
                    return java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).toMinutes() > PREP_DELAY_THRESHOLD_MINUTES;
                })
                .count();

        if (delayedOrders > 0) {
                alerts.add(new AlertSignal(
                    "CRITICAL",
                    "PREP_DELAY",
                    "Preparation delay warning",
                    "One or more active orders have crossed acceptable prep delay threshold.",
                    "Push delayed orders to priority lane and notify floor staff."
            ));
        }
    }

            private record AlertSignal(
                String severity,
                String type,
                String title,
                String description,
                String action
            ) {
            }
}
