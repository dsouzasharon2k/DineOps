package com.platterops.order;

import com.platterops.audit.AuditedAction;
import com.platterops.dto.OrderItemResponse;
import com.platterops.dto.OrderResponse;
import com.platterops.dto.OrderStatusHistoryResponse;
import com.platterops.dto.InitiatePaymentResponse;
import com.platterops.dto.UserResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.menu.MenuItem;
import com.platterops.menu.MenuItemRepository;
import com.platterops.notification.NotificationService;
import com.platterops.restaurant.OperatingHoursParser;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import com.platterops.table.DiningTableService;
import com.platterops.inventory.InventoryService;
import com.platterops.subscription.SubscriptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.Objects;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@SuppressWarnings("null")
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final int GST_PERCENT = 5;
    private static final int FALLBACK_PREP_TIME_MINUTES = 20;
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
    private final NotificationService notificationService;
    private final SubscriptionService subscriptionService;
    @Autowired(required = false)
    private InventoryService inventoryService;
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    public OrderService(OrderRepository orderRepository,
                        MenuItemRepository menuItemRepository,
                        RestaurantRepository restaurantRepository,
                        OrderStatusHistoryRepository orderStatusHistoryRepository,
                        DiningTableService diningTableService,
                        NotificationService notificationService,
                        SubscriptionService subscriptionService) {
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.restaurantRepository = restaurantRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.diningTableService = diningTableService;
        this.notificationService = notificationService;
        this.subscriptionService = subscriptionService;
    }

    // Place a new order - validates items, calculates total, saves everything
    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    @Transactional
    @AuditedAction(entityType = "ORDER", action = "CREATE")
    public Order placeOrder(PlaceOrderRequest request) {
        PlaceOrderRequest safeRequest = Objects.requireNonNull(request, "request cannot be null");
        Restaurant restaurant = restaurantRepository.findById(safeRequest.tenantId())
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        if (!OperatingHoursParser.isOpen(restaurant.getOperatingHours(), LocalDateTime.now())) {
            String hoursDisplay = restaurant.getOperatingHours() != null ? restaurant.getOperatingHours() : "Not specified";
            throw new IllegalArgumentException("Restaurant is currently closed. Operating hours: " + hoursDisplay);
        }

        long monthlyOrderCount = orderRepository.countByTenantIdAndCreatedAtGreaterThanEqual(
                safeRequest.tenantId(),
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0)
        );
        subscriptionService.validateTenantCanPlaceOrder(safeRequest.tenantId(), monthlyOrderCount);

        Order order = new Order();
        order.setTenant(restaurant);
        if (safeRequest.tableNumber() != null && !safeRequest.tableNumber().isBlank()) {
            String tableNum = safeRequest.tableNumber().trim();
            order.setTableNumber(tableNum);
            diningTableService.findOptionalByTenantAndNumber(safeRequest.tenantId(), tableNum)
                    .ifPresent(order::setTable);
        }
        order.setCustomerName(trimToNull(safeRequest.customerName()));
        order.setCustomerPhone(trimToNull(safeRequest.customerPhone()));
        order.setCustomerEmail(trimToNull(safeRequest.customerEmail()));
        order.setNotes(safeRequest.notes());

        int total = 0;

        // Build order items from the request
        for (PlaceOrderRequest.OrderItemRequest itemReq : safeRequest.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.menuItemId())
                    .orElseThrow(() -> new EntityNotFoundException("Menu item not found: " + itemReq.menuItemId()));

            // Snapshot the name and price at time of order
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setTenantRestaurant(restaurant);
            orderItem.setMenuItem(menuItem);
            orderItem.setName(menuItem.getName());
            orderItem.setPrice(menuItem.getPrice());
            orderItem.setQuantity(itemReq.quantity());
            if (inventoryService != null) {
                inventoryService.consumeStockIfTracked(menuItem, itemReq.quantity());
            }

            order.getItems().add(orderItem);
            total += menuItem.getPrice() * itemReq.quantity();
        }

        order.setTotalAmount(total);
        Order saved = orderRepository.save(order);
        notificationService.sendOrderPlacedNotification(saved);
        log.info("order_placed orderId={} tenantId={} totalAmount={} itemCount={}",
                saved.getId(),
                saved.getTenant().getId(),
                saved.getTotalAmount(),
                saved.getItems().size());
        return saved;
    }

    public OrderResponse placeOrderResponse(PlaceOrderRequest request) {
        OrderResponse response = toResponse(placeOrder(request));
        publishRealtimeUpdate(response);
        return response;
    }

    // Get a single order by ID (for customer status tracking - public)
    public Order getOrderById(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
    }

    public OrderResponse getOrderResponseById(UUID orderId) {
        return toResponse(getOrderById(orderId));
    }

    // Get all orders for a restaurant (used by TENANT_ADMIN and STAFF)
    public List<Order> getOrdersByTenant(UUID tenantId) {
        return orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

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
    @AuditedAction(entityType = "ORDER", action = "STATUS_UPDATE")
    public Order updateStatus(UUID orderId, OrderStatus newStatus) {
        UUID safeOrderId = Objects.requireNonNull(orderId, "orderId cannot be null");
        OrderStatus safeNewStatus = Objects.requireNonNull(newStatus, "newStatus cannot be null");

        Order order = orderRepository.findById(safeOrderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        OrderStatus currentStatus = order.getStatus();
        if (currentStatus != safeNewStatus && !isTransitionAllowed(currentStatus, safeNewStatus)) {
            throw new IllegalArgumentException(
                    "Invalid order status transition: " + currentStatus + " -> " + safeNewStatus);
        }
        if (currentStatus != safeNewStatus) {
            saveStatusHistory(order, currentStatus, safeNewStatus);
            notificationService.sendOrderStatusNotification(order, currentStatus, safeNewStatus);
        }
        order.setStatus(safeNewStatus);
        log.info("Order status changed: orderId={}, from={}, to={}", safeOrderId, currentStatus, safeNewStatus);
        return orderRepository.save(order);
    }

    public OrderResponse updateStatusResponse(UUID orderId, OrderStatus newStatus) {
        OrderResponse response = toResponse(updateStatus(orderId, newStatus));
        publishRealtimeUpdate(response);
        return response;
    }

    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    @AuditedAction(entityType = "ORDER", action = "CUSTOMER_CANCEL")
    public OrderResponse customerCancelOrder(UUID orderId) {
        UUID safeOrderId = Objects.requireNonNull(orderId, "orderId cannot be null");
        Order order = orderRepository.findById(safeOrderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        OrderStatus currentStatus = order.getStatus();

        if (currentStatus == OrderStatus.PENDING) {
            saveStatusHistory(order, currentStatus, OrderStatus.CANCELLED);
            order.setStatus(OrderStatus.CANCELLED);
            OrderResponse response = toResponse(orderRepository.save(order));
            publishRealtimeUpdate(response);
            return response;
        }

        if (currentStatus == OrderStatus.CONFIRMED) {
            throw new IllegalArgumentException("Order is confirmed and now requires kitchen approval for cancellation.");
        }

        throw new IllegalArgumentException("Cancellation window has passed for this order.");
    }

    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    @AuditedAction(entityType = "PAYMENT", action = "INITIATE")
    public InitiatePaymentResponse initiatePayment(UUID orderId, PaymentMethod paymentMethod) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        PaymentMethod safeMethod = Objects.requireNonNull(paymentMethod, "paymentMethod cannot be null");
        order.setPaymentMethod(safeMethod);

        if (safeMethod == PaymentMethod.CASH) {
            order.setPaymentStatus(PaymentStatus.UNPAID);
            Order saved = orderRepository.save(order);
            return new InitiatePaymentResponse(saved.getId(), saved.getPaymentStatus(), saved.getPaymentMethod(), null, null);
        }

        String providerOrderRef = "pay_" + UUID.randomUUID().toString().replace("-", "");
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setPaymentProviderOrderRef(providerOrderRef);
        Order saved = orderRepository.save(order);
        String checkoutUrl = "/pay/checkout/" + saved.getId() + "?ref=" + providerOrderRef;
        return new InitiatePaymentResponse(saved.getId(), saved.getPaymentStatus(), saved.getPaymentMethod(), providerOrderRef, checkoutUrl);
    }

    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    @AuditedAction(entityType = "PAYMENT", action = "WEBHOOK")
    public OrderResponse handlePaymentWebhook(String providerOrderRef, String providerPaymentRef, boolean success) {
        String safeProviderOrderRef = Objects.requireNonNull(providerOrderRef, "providerOrderRef cannot be null");
        Order order = orderRepository.findByPaymentProviderOrderRef(safeProviderOrderRef)
                .orElseThrow(() -> new EntityNotFoundException("Order not found for providerOrderRef: " + safeProviderOrderRef));
        order.setPaymentProviderPaymentRef(providerPaymentRef);
        order.setPaymentStatus(success ? PaymentStatus.PAID : PaymentStatus.FAILED);
        return toResponse(orderRepository.save(order));
    }

    public List<OrderStatusHistoryResponse> getStatusHistory(UUID orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new EntityNotFoundException("Order not found");
        }
        return orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(orderId).stream()
                .map(this::toStatusHistoryResponse)
                .toList();
    }

    public List<OrderResponse> lookupRecentOrdersByPhone(UUID tenantId, String phone) {
        String normalizedPhone = trimToNull(phone);
        if (normalizedPhone == null) {
            throw new IllegalArgumentException("Phone is required for order lookup.");
        }
        return orderRepository.findTop10ByTenantIdAndCustomerPhoneOrderByCreatedAtDesc(tenantId, normalizedPhone).stream()
                .map(this::toResponse)
                .toList();
    }

    public byte[] generateInvoicePdf(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        int totalPaise = order.getTotalAmount();
        int taxableAmountPaise = (int) Math.round(totalPaise / (1 + (GST_PERCENT / 100.0)));
        int gstAmountPaise = totalPaise - taxableAmountPaise;

        StringBuilder invoice = new StringBuilder();
        invoice.append("PlatterOps Invoice\n");
        invoice.append("====================\n");
        invoice.append("Order ID: ").append(order.getId()).append('\n');
        invoice.append("Date: ").append(order.getCreatedAt()).append("\n\n");
        invoice.append("Restaurant: ").append(order.getTenant().getName()).append('\n');
        invoice.append("FSSAI: ").append(order.getTenant().getFssaiLicense() == null ? "N/A" : order.getTenant().getFssaiLicense()).append('\n');
        invoice.append("GSTIN: ").append(order.getTenant().getGstNumber() == null ? "N/A" : order.getTenant().getGstNumber()).append("\n\n");
        invoice.append("Items:\n");
        for (OrderItem item : order.getItems()) {
            int lineAmountPaise = item.getPrice() * item.getQuantity();
            invoice.append("- ")
                    .append(item.getName())
                    .append(" x ")
                    .append(item.getQuantity())
                    .append(" = INR ")
                    .append(String.format("%.2f", lineAmountPaise / 100.0))
                    .append('\n');
        }
        invoice.append('\n');
        invoice.append("Taxable Amount: INR ").append(String.format("%.2f", taxableAmountPaise / 100.0)).append('\n');
        invoice.append("GST (").append(GST_PERCENT).append("%): INR ").append(String.format("%.2f", gstAmountPaise / 100.0)).append('\n');
        invoice.append("Grand Total: INR ").append(String.format("%.2f", totalPaise / 100.0)).append('\n');
        invoice.append("Payment: ").append(order.getPaymentMethod()).append(" / ").append(order.getPaymentStatus()).append('\n');

        return invoice.toString().getBytes(StandardCharsets.UTF_8);
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

    private static String firstNonEmpty(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b;
    }

    private OrderResponse toResponse(Order order) {
        Integer estimatedReadyMinutes = estimateReadyMinutes(order);
        return new OrderResponse(
                order.getId(),
                order.getTenant().getId(),
                toUserResponse(order.getCustomer()),
                firstNonEmpty(order.getTableNumber(), order.getTable() != null ? order.getTable().getTableNumber() : null),
                order.getStatus(),
                order.getPaymentStatus(),
                order.getPaymentMethod(),
                estimatedReadyMinutes,
                order.getTotalAmount(),
                order.getNotes(),
                order.getItems().stream().map(this::toItemResponse).toList(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    private Integer estimateReadyMinutes(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED) {
            return 0;
        }

        int estimatedTotal = resolveEstimatedPrepTotal(order);
        long elapsed = Math.max(0, java.time.Duration.between(order.getCreatedAt(), LocalDateTime.now()).toMinutes());
        int remaining = (int) Math.max(1, estimatedTotal - elapsed);
        return remaining;
    }

    private int resolveEstimatedPrepTotal(Order order) {
        int maxItemPrep = order.getItems().stream()
                .map(OrderItem::getMenuItem)
                .filter(Objects::nonNull)
                .map(MenuItem::getPrepTimeMinutes)
                .filter(Objects::nonNull)
                .filter(value -> value > 0)
                .max(Integer::compareTo)
                .orElse(0);
        if (maxItemPrep > 0) {
            return maxItemPrep;
        }

        int historicalAverage = computeHistoricalAveragePrepMinutes(order.getTenant().getId());
        if (historicalAverage > 0) {
            return historicalAverage;
        }

        Integer restaurantDefault = order.getTenant().getDefaultPrepTimeMinutes();
        if (restaurantDefault != null && restaurantDefault > 0) {
            return restaurantDefault;
        }
        return FALLBACK_PREP_TIME_MINUTES;
    }

    private int computeHistoricalAveragePrepMinutes(UUID tenantId) {
        List<OrderStatusHistory> history = orderStatusHistoryRepository.findByOrderTenantIdOrderByChangedAtAsc(tenantId);
        Map<UUID, LocalDateTime> confirmedTimes = new java.util.HashMap<>();
        List<Long> durations = new java.util.ArrayList<>();

        for (OrderStatusHistory item : history) {
            UUID orderId = item.getOrder().getId();
            if (item.getNewStatus() == OrderStatus.CONFIRMED && !confirmedTimes.containsKey(orderId)) {
                confirmedTimes.put(orderId, item.getChangedAt());
            }
            if (item.getNewStatus() == OrderStatus.READY) {
                LocalDateTime confirmedAt = confirmedTimes.get(orderId);
                if (confirmedAt != null && !item.getChangedAt().isBefore(confirmedAt)) {
                    durations.add(java.time.Duration.between(confirmedAt, item.getChangedAt()).toMinutes());
                }
            }
        }
        if (durations.isEmpty()) {
            return 0;
        }
        return (int) Math.round(durations.stream().mapToLong(Long::longValue).average().orElse(0));
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

    private UserResponse toUserResponse(com.platterops.user.User user) {
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void publishRealtimeUpdate(OrderResponse response) {
        if (messagingTemplate == null || response == null) {
            return;
        }
        messagingTemplate.convertAndSend("/topic/orders/" + response.tenantId(), response);
        messagingTemplate.convertAndSend("/topic/order/" + response.id(), response);
    }
}