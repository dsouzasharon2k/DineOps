package com.dineops.order;

import com.dineops.exception.EntityNotFoundException;
import com.dineops.menu.MenuItem;
import com.dineops.menu.MenuItemRepository;
import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS =
            new EnumMap<>(OrderStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.CONFIRMED, Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.PREPARING, Set.of(OrderStatus.READY, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.READY, Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(OrderStatus.DELIVERED, Set.of());
        ALLOWED_TRANSITIONS.put(OrderStatus.CANCELLED, Set.of());
    }

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;

    public OrderService(OrderRepository orderRepository,
                        MenuItemRepository menuItemRepository,
                        RestaurantRepository restaurantRepository) {
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.restaurantRepository = restaurantRepository;
    }

    // Place a new order - validates items, calculates total, saves everything
    @Transactional
    public Order placeOrder(PlaceOrderRequest request) {
        Restaurant restaurant = restaurantRepository.findById(request.tenantId())
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        Order order = new Order();
        order.setTenant(restaurant);
        order.setNotes(request.notes());

        int total = 0;

        // Build order items from the request
        for (PlaceOrderRequest.OrderItemRequest itemReq : request.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.menuItemId())
                    .orElseThrow(() -> new EntityNotFoundException("Menu item not found: " + itemReq.menuItemId()));

            // Snapshot the name and price at time of order
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItem(menuItem);
            orderItem.setName(menuItem.getName());
            orderItem.setPrice(menuItem.getPrice());
            orderItem.setQuantity(itemReq.quantity());

            order.getItems().add(orderItem);
            total += menuItem.getPrice() * itemReq.quantity();
        }

        order.setTotalAmount(total);
        return orderRepository.save(order);
    }

    // Get a single order by ID (for customer status tracking - public)
    public Order getOrderById(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
    }

    // Get all orders for a restaurant (used by TENANT_ADMIN and STAFF)
    public List<Order> getOrdersByTenant(UUID tenantId) {
        return orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    // Get active orders only - excludes DELIVERED and CANCELLED (kitchen view)
    public List<Order> getActiveOrders(UUID tenantId) {
        return orderRepository.findByTenantIdAndStatusNotInOrderByCreatedAtAsc(
                tenantId,
                List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED)
        );
    }

    // Update order status - used by kitchen staff to move order through lifecycle
    public Order updateStatus(UUID orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        OrderStatus currentStatus = order.getStatus();
        if (currentStatus != newStatus && !isTransitionAllowed(currentStatus, newStatus)) {
            throw new IllegalArgumentException(
                    "Invalid order status transition: " + currentStatus + " -> " + newStatus);
        }
        order.setStatus(newStatus);
        log.info("Order status changed: orderId={}, from={}, to={}", orderId, currentStatus, newStatus);
        return orderRepository.save(order);
    }

    private boolean isTransitionAllowed(OrderStatus from, OrderStatus to) {
        return ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}