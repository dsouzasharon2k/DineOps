package com.dineops.order;

import com.dineops.menu.MenuItem;
import com.dineops.menu.MenuItemRepository;
import com.dineops.notification.NotificationService;
import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import com.dineops.subscription.SubscriptionService;
import com.dineops.table.DiningTableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class OrderServiceTest {

    private static final Map<OrderStatus, Set<OrderStatus>> EXPECTED_ALLOWED_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED),
            OrderStatus.PREPARING, Set.of(OrderStatus.READY, OrderStatus.CANCELLED),
            OrderStatus.READY, Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
            OrderStatus.DELIVERED, Set.of(),
            OrderStatus.CANCELLED, Set.of()
    );

    private OrderRepository orderRepository;
    private OrderStatusHistoryRepository orderStatusHistoryRepository;
    private MenuItemRepository menuItemRepository;
    private RestaurantRepository restaurantRepository;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderRepository = Mockito.mock(OrderRepository.class);
        orderStatusHistoryRepository = Mockito.mock(OrderStatusHistoryRepository.class);
        menuItemRepository = Mockito.mock(MenuItemRepository.class);
        restaurantRepository = Mockito.mock(RestaurantRepository.class);
        DiningTableService diningTableService = Mockito.mock(DiningTableService.class);
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        SubscriptionService subscriptionService = Mockito.mock(SubscriptionService.class);
        orderService = new OrderService(
                orderRepository,
                menuItemRepository,
                restaurantRepository,
                orderStatusHistoryRepository,
                diningTableService,
                notificationService,
                subscriptionService
        );
    }

    @Test
    void updateStatus_allowsValidTransition_pendingToConfirmed() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order();
        order.setStatus(OrderStatus.PENDING);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order updated = orderService.updateStatus(orderId, OrderStatus.CONFIRMED);

        assertEquals(OrderStatus.CONFIRMED, updated.getStatus());
        verify(orderRepository).save(order);
        verify(orderStatusHistoryRepository).save(any(OrderStatusHistory.class));
    }

    @Test
    void updateStatus_allowsCancellationFromAnyActiveState() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order();
        order.setStatus(OrderStatus.PREPARING);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order updated = orderService.updateStatus(orderId, OrderStatus.CANCELLED);

        assertEquals(OrderStatus.CANCELLED, updated.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void updateStatus_rejectsInvalidTransition_deliveredToPending() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order();
        order.setStatus(OrderStatus.DELIVERED);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> orderService.updateStatus(orderId, OrderStatus.PENDING));

        assertEquals(
                "Invalid order status transition: DELIVERED -> PENDING",
                ex.getMessage());
    }

    @Test
    void updateStatus_allowsAllConfiguredValidTransitions() {
        for (Map.Entry<OrderStatus, Set<OrderStatus>> entry : EXPECTED_ALLOWED_TRANSITIONS.entrySet()) {
            for (OrderStatus target : entry.getValue()) {
                UUID orderId = UUID.randomUUID();
                Order order = new Order();
                order.setStatus(entry.getKey());

                when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
                when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

                Order updated = orderService.updateStatus(orderId, target);
                assertEquals(target, updated.getStatus());
            }
        }
    }

    @Test
    void updateStatus_rejectsAllNonConfiguredTransitions() {
        for (OrderStatus from : OrderStatus.values()) {
            for (OrderStatus to : OrderStatus.values()) {
                if (from == to || EXPECTED_ALLOWED_TRANSITIONS.get(from).contains(to)) {
                    continue;
                }

                UUID orderId = UUID.randomUUID();
                Order order = new Order();
                order.setStatus(from);

                when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> orderService.updateStatus(orderId, to));
                assertEquals("Invalid order status transition: " + from + " -> " + to, ex.getMessage());
            }
        }
    }

    @Test
    void customerCancelOrder_allowsPendingOrderCancellation() {
        UUID orderId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Order order = new Order();
        Restaurant tenant = new Restaurant();
        try {
            java.lang.reflect.Field idField = Restaurant.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(tenant, tenantId);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
        order.setTenant(tenant);
        order.setStatus(OrderStatus.PENDING);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = orderService.customerCancelOrder(orderId);

        assertEquals(OrderStatus.CANCELLED, response.status());
        verify(orderStatusHistoryRepository).save(any(OrderStatusHistory.class));
    }

    @Test
    void customerCancelOrder_rejectsConfirmedOrder() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order();
        order.setStatus(OrderStatus.CONFIRMED);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> orderService.customerCancelOrder(orderId));

        assertEquals("Order is confirmed and now requires kitchen approval for cancellation.", ex.getMessage());
    }

    @Test
    void placeOrder_whenRestaurantClosed_throwsIllegalArgumentException() {
        UUID tenantId = UUID.randomUUID();
        UUID menuItemId = UUID.randomUUID();
        Restaurant restaurant = new Restaurant();
        try {
            java.lang.reflect.Field idField = Restaurant.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(restaurant, tenantId);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
        // All days null = closed every day
        restaurant.setOperatingHours("""
            {"monday":null,"tuesday":null,"wednesday":null,"thursday":null,"friday":null,"saturday":null,"sunday":null}
            """);

        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(restaurant));
        when(orderRepository.countByTenantIdAndCreatedAtGreaterThanEqual(any(), any())).thenReturn(0L);

        PlaceOrderRequest request = new PlaceOrderRequest(
                tenantId,
                null,
                null,
                null,
                null,
                null,
                List.of(new PlaceOrderRequest.OrderItemRequest(menuItemId, 1))
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> orderService.placeOrder(request));

        assertEquals("Restaurant is currently closed. Operating hours: " + restaurant.getOperatingHours(), ex.getMessage());
    }

    @Test
    void placeOrder_whenRestaurantOpen_succeeds() {
        UUID tenantId = UUID.randomUUID();
        UUID menuItemId = UUID.randomUUID();
        Restaurant restaurant = new Restaurant();
        try {
            java.lang.reflect.Field idField = Restaurant.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(restaurant, tenantId);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
        restaurant.setOperatingHours(null); // null = always open

        MenuItem menuItem = new MenuItem();
        try {
            java.lang.reflect.Field idField = MenuItem.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(menuItem, menuItemId);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
        menuItem.setName("Test Item");
        menuItem.setPrice(1000);
        menuItem.setTenant(restaurant);

        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(restaurant));
        when(orderRepository.countByTenantIdAndCreatedAtGreaterThanEqual(any(), any())).thenReturn(0L);
        when(menuItemRepository.findById(menuItemId)).thenReturn(Optional.of(menuItem));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaceOrderRequest request = new PlaceOrderRequest(
                tenantId,
                null,
                null,
                null,
                null,
                null,
                List.of(new PlaceOrderRequest.OrderItemRequest(menuItemId, 1))
        );

        Order order = orderService.placeOrder(request);

        assertEquals(tenantId, order.getTenant().getId());
        assertEquals(1000, order.getTotalAmount());
        assertEquals(1, order.getItems().size());
    }
}
