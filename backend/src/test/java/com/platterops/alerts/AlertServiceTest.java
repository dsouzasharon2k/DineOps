package com.platterops.alerts;

import com.platterops.inventory.WastageRepository;
import com.platterops.order.Order;
import com.platterops.order.OrderRepository;
import com.platterops.order.OrderStatus;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AlertServiceTest {

    private WastageRepository wastageRepository;
    private OrderRepository orderRepository;
    private AlertRecordRepository alertRecordRepository;
    private RestaurantRepository restaurantRepository;
    private AlertService alertService;

    @BeforeEach
    void setUp() {
        wastageRepository = Mockito.mock(WastageRepository.class);
        orderRepository = Mockito.mock(OrderRepository.class);
        alertRecordRepository = Mockito.mock(AlertRecordRepository.class);
        restaurantRepository = Mockito.mock(RestaurantRepository.class);
        alertService = new AlertService(wastageRepository, orderRepository, alertRecordRepository, restaurantRepository);
    }

    @Test
    void getAlerts_whenNoSignals_shouldReturnInfoAlert() {
        UUID tenantId = UUID.randomUUID();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(new Restaurant()));
        when(wastageRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(eq(tenantId), any(), any())).thenReturn(List.of());
        when(orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(List.of());
        when(alertRecordRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(List.of());

        var alerts = alertService.getAlerts(tenantId);

        assertEquals(1, alerts.size());
        assertEquals("INFO", alerts.get(0).severity());
    }

    @Test
    void getAlerts_whenPrepDelayExists_shouldReturnCriticalAlert() {
        UUID tenantId = UUID.randomUUID();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(new Restaurant()));
        when(wastageRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(eq(tenantId), any(), any())).thenReturn(List.of());
        when(alertRecordRepository.findTopByTenantIdAndTypeAndIsReadFalseOrderByCreatedAtDesc(eq(tenantId), any())).thenReturn(Optional.empty());

        Order delayed = new Order();
        delayed.setStatus(OrderStatus.PENDING);
        try {
            java.lang.reflect.Field createdAtField = delayed.getClass().getSuperclass().getDeclaredField("createdAt");
            createdAtField.setAccessible(true);
            createdAtField.set(delayed, LocalDateTime.now().minusMinutes(50));
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }

        when(orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(List.of(delayed));
        AlertRecord persisted = new AlertRecord();
        persisted.setSeverity("CRITICAL");
        persisted.setType("PREP_DELAY");
        persisted.setTitle("Preparation delay warning");
        persisted.setMessage("One or more active orders have crossed acceptable prep delay threshold.");
        persisted.setActionHint("Push delayed orders to priority lane and notify floor staff.");
        ReflectionTestUtils.setField(persisted, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(persisted, "createdAt", LocalDateTime.now());
        when(alertRecordRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(List.of(persisted));

        var alerts = alertService.getAlerts(tenantId);

        assertTrue(alerts.stream().anyMatch(alert -> "CRITICAL".equals(alert.severity())));
    }

    @Test
    void getAlerts_whenManagedSignalNoLongerActive_shouldAutoResolveUnreadAlert() {
        UUID tenantId = UUID.randomUUID();
        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(new Restaurant()));
        when(wastageRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(eq(tenantId), any(), any())).thenReturn(List.of());
        when(orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(List.of());

        AlertRecord stale = new AlertRecord();
        stale.setSeverity("WARNING");
        stale.setType("KITCHEN_BACKLOG");
        stale.setTitle("Kitchen backlog risk");
        stale.setMessage("High number of pending/confirmed orders may impact service speed.");
        stale.setActionHint("Reassign staff and prioritize oldest pending tickets first.");
        stale.setRead(false);
        ReflectionTestUtils.setField(stale, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(stale, "createdAt", LocalDateTime.now().minusHours(1));

        when(alertRecordRepository.findByTenantIdAndIsReadFalseOrderByCreatedAtDesc(tenantId)).thenReturn(List.of(stale));
        when(alertRecordRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(List.of(stale));

        var alerts = alertService.getAlerts(tenantId);

        assertEquals(1, alerts.size());
        assertTrue(alerts.get(0).read());
        verify(alertRecordRepository).saveAll(any());
    }

    @Test
    void markAsRead_shouldSetReadFlags() {
        UUID tenantId = UUID.randomUUID();
        UUID alertId = UUID.randomUUID();

        AlertRecord persisted = new AlertRecord();
        persisted.setSeverity("WARNING");
        persisted.setType("KITCHEN_BACKLOG");
        persisted.setTitle("Kitchen backlog risk");
        persisted.setMessage("High number of pending/confirmed orders may impact service speed.");
        persisted.setActionHint("Reassign staff and prioritize oldest pending tickets first.");
        persisted.setRead(false);
        ReflectionTestUtils.setField(persisted, "id", alertId);
        ReflectionTestUtils.setField(persisted, "createdAt", LocalDateTime.now());

        when(alertRecordRepository.findByIdAndTenantId(alertId, tenantId)).thenReturn(Optional.of(persisted));

        var response = alertService.markAsRead(tenantId, alertId);

        assertTrue(response.read());
        assertEquals(alertId, response.id());
    }

    @Test
    void getUnreadCount_shouldReturnRepositoryCount() {
        UUID tenantId = UUID.randomUUID();
        when(alertRecordRepository.countByTenantIdAndIsReadFalse(tenantId)).thenReturn(4L);

        int unread = alertService.getUnreadCount(tenantId);

        assertEquals(4, unread);
    }

    @Test
    void markAllAsRead_shouldUpdateUnreadAlerts() {
        UUID tenantId = UUID.randomUUID();
        AlertRecord first = new AlertRecord();
        first.setRead(false);
        AlertRecord second = new AlertRecord();
        second.setRead(false);
        when(alertRecordRepository.findByTenantIdAndIsReadFalseOrderByCreatedAtDesc(tenantId))
                .thenReturn(List.of(first, second));

        int updated = alertService.markAllAsRead(tenantId);

        assertEquals(2, updated);
        assertTrue(first.isRead());
        assertTrue(second.isRead());
        verify(alertRecordRepository).saveAll(any());
    }
}
