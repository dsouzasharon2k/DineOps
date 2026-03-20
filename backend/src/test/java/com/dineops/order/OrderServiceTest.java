package com.dineops.order;

import com.dineops.menu.MenuItemRepository;
import com.dineops.restaurant.RestaurantRepository;
import com.dineops.table.DiningTableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

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
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderRepository = Mockito.mock(OrderRepository.class);
        orderStatusHistoryRepository = Mockito.mock(OrderStatusHistoryRepository.class);
        MenuItemRepository menuItemRepository = Mockito.mock(MenuItemRepository.class);
        RestaurantRepository restaurantRepository = Mockito.mock(RestaurantRepository.class);
        DiningTableService diningTableService = Mockito.mock(DiningTableService.class);
        orderService = new OrderService(
                orderRepository,
                menuItemRepository,
                restaurantRepository,
                orderStatusHistoryRepository,
                diningTableService
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
}
