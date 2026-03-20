package com.dineops.order;

import com.dineops.dto.OrderItemResponse;
import com.dineops.dto.OrderResponse;
import com.dineops.dto.OrderStatusHistoryResponse;
import com.dineops.dto.UserResponse;
import com.dineops.exception.EntityNotFoundException;
import com.dineops.menu.MenuItem;
import com.dineops.menu.MenuItemRepository;
import com.dineops.restaurant.Restaurant;
import com.dineops.restaurant.RestaurantRepository;
import com.dineops.table.DiningTableService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@SuppressWarnings("null")
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
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final DiningTableService diningTableService;

    public OrderService(OrderRepository orderRepository,
                        MenuItemRepository menuItemRepository,
                        RestaurantRepository restaurantRepository,
                        OrderStatusHistoryRepository orderStatusHistoryRepository,
                        DiningTableService diningTableService) {
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.restaurantRepository = restaurantRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.diningTableService = diningTableService;
    }

    // Place a new order - validates items, calculates total, saves everything
    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    @Transactional
    public Order placeOrder(PlaceOrderRequest request) {
        Restaurant restaurant = restaurantRepository.findById(request.tenantId())
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        Order order = new Order();
        order.setTenant(restaurant);
        if (request.tableNumber() != null && !request.tableNumber().isBlank()) {
            order.setTable(diningTableService.findByTenantAndNumber(request.tenantId(), request.tableNumber()));
        }
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
        Order saved = orderRepository.save(order);
        log.info("order_placed orderId={} tenantId={} totalAmount={} itemCount={}",
                saved.getId(),
                saved.getTenant().getId(),
                saved.getTotalAmount(),
                saved.getItems().size());
        return saved;
    }

    public OrderResponse placeOrderResponse(PlaceOrderRequest request) {
        return toResponse(placeOrder(request));
    }

    // Get a single order by ID (for customer status tracking - public)
    public Order getOrderById(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
    }

    @Cacheable(cacheNames = "orders:by-id", key = "#orderId")
    public OrderResponse getOrderResponseById(UUID orderId) {
        return toResponse(getOrderById(orderId));
    }

    // Get all orders for a restaurant (used by TENANT_ADMIN and STAFF)
    public List<Order> getOrdersByTenant(UUID tenantId) {
        return orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Cacheable(cacheNames = "orders:by-tenant", key = "#tenantId + ':' + #page + ':' + #size")
    public Page<OrderResponse> getOrderResponsesByTenant(UUID tenantId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Order> orders = orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        List<OrderResponse> content = orders.getContent().stream()
                .map(this::toResponse)
                .toList();
        return new PageImpl<>(content, pageable, orders.getTotalElements());
    }

    // Get active orders only - excludes DELIVERED and CANCELLED (kitchen view)
    public List<Order> getActiveOrders(UUID tenantId) {
        return orderRepository.findByTenantIdAndStatusNotInOrderByCreatedAtAsc(
                tenantId,
                List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED)
        );
    }

    @Cacheable(cacheNames = "orders:active-by-tenant", key = "#tenantId + ':' + #page + ':' + #size")
    public Page<OrderResponse> getActiveOrderResponses(UUID tenantId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Order> orders = orderRepository.findByTenantIdAndStatusNotInOrderByCreatedAtAsc(
                tenantId,
                List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
                pageable
        );
        List<OrderResponse> content = orders.getContent().stream()
                .map(this::toResponse)
                .toList();
        return new PageImpl<>(content, pageable, orders.getTotalElements());
    }

    // Update order status - used by kitchen staff to move order through lifecycle
    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    public Order updateStatus(UUID orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        OrderStatus currentStatus = order.getStatus();
        if (currentStatus != newStatus && !isTransitionAllowed(currentStatus, newStatus)) {
            throw new IllegalArgumentException(
                    "Invalid order status transition: " + currentStatus + " -> " + newStatus);
        }
        if (currentStatus != newStatus) {
            saveStatusHistory(order, currentStatus, newStatus);
        }
        order.setStatus(newStatus);
        log.info("Order status changed: orderId={}, from={}, to={}", orderId, currentStatus, newStatus);
        return orderRepository.save(order);
    }

    public OrderResponse updateStatusResponse(UUID orderId, OrderStatus newStatus) {
        return toResponse(updateStatus(orderId, newStatus));
    }

    public List<OrderStatusHistoryResponse> getStatusHistory(UUID orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new EntityNotFoundException("Order not found");
        }
        return orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(orderId).stream()
                .map(this::toStatusHistoryResponse)
                .toList();
    }

    private boolean isTransitionAllowed(OrderStatus from, OrderStatus to) {
        return ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    private void saveStatusHistory(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(resolveChangedBy());
        history.setChangedAt(LocalDateTime.now());
        orderStatusHistoryRepository.save(history);
    }

    private String resolveChangedBy() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "system";
        }
        return authentication.getName();
    }

    private OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getTenant().getId(),
                toUserResponse(order.getCustomer()),
                order.getTable() != null ? order.getTable().getTableNumber() : null,
                order.getStatus(),
                order.getTotalAmount(),
                order.getNotes(),
                order.getItems().stream().map(this::toItemResponse).toList(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getMenuItem() != null ? item.getMenuItem().getId() : null,
                item.getName(),
                item.getPrice(),
                item.getQuantity(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }

    private UserResponse toUserResponse(com.dineops.user.User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
                user.getId(),
                user.getTenant() != null ? user.getTenant().getId() : null,
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private OrderStatusHistoryResponse toStatusHistoryResponse(OrderStatusHistory history) {
        return new OrderStatusHistoryResponse(
                history.getId(),
                history.getOldStatus(),
                history.getNewStatus(),
                history.getChangedBy(),
                history.getChangedAt()
        );
    }
}