package com.platterops.order;

import com.platterops.audit.AuditedAction;
import com.platterops.dto.OrderItemResponse;
import com.platterops.dto.OrderDisputeResponse;
import com.platterops.dto.OrderResponse;
import com.platterops.dto.OrderStatusHistoryResponse;
import com.platterops.dto.InitiatePaymentResponse;
import com.platterops.dto.PageResponse;
import com.platterops.dto.UserResponse;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.menu.MenuItem;
import com.platterops.menu.MenuItemRepository;
import com.platterops.notification.OrderNotificationService;
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
import java.time.format.DateTimeFormatter;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.Objects;
import java.util.Locale;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;

import java.util.concurrent.CompletableFuture;

@Service
@SuppressWarnings("null")
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final String SAC_CODE_RESTAURANT_SERVICE = "996331";
    private static final DateTimeFormatter INVOICE_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
    private static final int FALLBACK_PREP_TIME_MINUTES = 20;
    private static final long HISTORICAL_PREP_LOOKBACK_DAYS = 90;
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
    private final OrderDisputeRepository orderDisputeRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final DiningTableService diningTableService;
    private final OrderNotificationService notificationService;
    private final SubscriptionService subscriptionService;
    private final PaymentGatewayService paymentGatewayService;
    private final com.platterops.restaurant.zone.QrCodeRepository qrCodeRepository;
    private final com.platterops.restaurant.zone.MenuItemZonePriceRepository menuItemZonePriceRepository;
    
    @Autowired(required = false)
    private InventoryService inventoryService;
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;
    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    public OrderService(OrderRepository orderRepository,
                        OrderDisputeRepository orderDisputeRepository,
                        MenuItemRepository menuItemRepository,
                        RestaurantRepository restaurantRepository,
                        OrderStatusHistoryRepository orderStatusHistoryRepository,
                        DiningTableService diningTableService,
                        OrderNotificationService notificationService,
                        SubscriptionService subscriptionService,
                        PaymentGatewayService paymentGatewayService,
                        com.platterops.restaurant.zone.QrCodeRepository qrCodeRepository,
                        com.platterops.restaurant.zone.MenuItemZonePriceRepository menuItemZonePriceRepository) {
        this.orderRepository = orderRepository;
        this.orderDisputeRepository = orderDisputeRepository;
        this.menuItemRepository = menuItemRepository;
        this.restaurantRepository = restaurantRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.diningTableService = diningTableService;
        this.notificationService = notificationService;
        this.subscriptionService = subscriptionService;
        this.paymentGatewayService = paymentGatewayService;
        this.qrCodeRepository = qrCodeRepository;
        this.menuItemZonePriceRepository = menuItemZonePriceRepository;
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
        order.setInvoiceNumber(nextInvoiceNumber(restaurant.getId()));

        // Resolve QR Context
        if (trimToNull(safeRequest.qrCodeSourceIdentifier()) != null) {
            qrCodeRepository.findBySourceIdentifier(safeRequest.qrCodeSourceIdentifier())
                .ifPresent(qr -> {
                    order.setQrCode(qr);
                    order.setDiningZone(qr.getDiningZone());
                    if (qr.getTableNumber() != null) {
                        order.setTableNumber(qr.getTableNumber().toString());
                    }
                });
        }

        if (order.getTableNumber() == null && safeRequest.tableNumber() != null && !safeRequest.tableNumber().isBlank()) {
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
            
            // Resolve contextual price
            int finalPrice = menuItem.getPrice();
            if (order.getDiningZone() != null) {
                var override = menuItemZonePriceRepository.findByMenuItemIdAndDiningZoneId(menuItem.getId(), order.getDiningZone().getId());
                if (override.isPresent() && override.get().getOverridePrice() != null) {
                    finalPrice = override.get().getOverridePrice().intValue();
                }
            }
            
            orderItem.setPrice(finalPrice);
            orderItem.setQuantity(itemReq.quantity());
            orderItem.setCostAtOrder(menuItem.getBaseCost());
            if (inventoryService != null) {
                inventoryService.consumeStockIfTracked(menuItem, itemReq.quantity());
            }

            order.getItems().add(orderItem);
            total += finalPrice * itemReq.quantity();
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

        order.setPaymentStatus(PaymentStatus.PENDING);
        Order saved = orderRepository.save(order);
        PaymentGatewayService.PaymentInitResult paymentInit = paymentGatewayService.createPaymentOrder(saved.getId(), saved.getTotalAmount());
        String providerOrderRef = paymentInit.providerOrderRef();
        saved.setPaymentProviderOrderRef(providerOrderRef);
        saved = orderRepository.save(saved);
        String checkoutUrl = paymentInit.checkoutUrl();
        return new InitiatePaymentResponse(saved.getId(), saved.getPaymentStatus(), saved.getPaymentMethod(), providerOrderRef, checkoutUrl);
    }

    @CacheEvict(cacheNames = {"orders:by-id", "orders:active-by-tenant", "orders:by-tenant"}, allEntries = true)
    @AuditedAction(entityType = "PAYMENT", action = "WEBHOOK")
    public OrderResponse handlePaymentWebhook(String providerOrderRef, String providerPaymentRef, boolean success) {
        String safeProviderOrderRef = Objects.requireNonNull(providerOrderRef, "providerOrderRef cannot be null");
        Order order = orderRepository.findByPaymentProviderOrderRef(safeProviderOrderRef)
                .orElseThrow(() -> new EntityNotFoundException("Order not found for providerOrderRef: " + safeProviderOrderRef));
        String safeProviderPaymentRef = trimToNull(providerPaymentRef);

        if (safeProviderPaymentRef != null) {
            orderRepository.findByPaymentProviderPaymentRef(safeProviderPaymentRef).ifPresent(existing -> {
                if (!existing.getId().equals(order.getId())) {
                    throw new IllegalArgumentException("Payment reference has already been processed for another order.");
                }
            });
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID
                && success
                && Objects.equals(trimToNull(order.getPaymentProviderPaymentRef()), safeProviderPaymentRef)) {
            return toResponse(order);
        }
        order.setPaymentProviderPaymentRef(safeProviderPaymentRef);
        order.setPaymentStatus(success ? PaymentStatus.PAID : PaymentStatus.FAILED);
        return toResponse(orderRepository.save(order));
    }

    private long nextInvoiceNumber(UUID tenantId) {
        if (jdbcTemplate != null) {
            try {
                String sql = """
                        INSERT INTO invoice_counters (tenant_id, last_invoice_number, updated_at)
                        VALUES (?::uuid, 1, NOW())
                        ON CONFLICT (tenant_id)
                        DO UPDATE SET
                            last_invoice_number = invoice_counters.last_invoice_number + 1,
                            updated_at = NOW()
                        RETURNING last_invoice_number
                        """;
                Long next = jdbcTemplate.queryForObject(sql, Long.class, tenantId.toString());
                if (next != null && next > 0) {
                    return next;
                }
            } catch (Exception ex) {
                log.warn("invoice_counter_fallback tenantId={} reason={}", tenantId, ex.getMessage());
            }
        }
        return orderRepository.findMaxInvoiceNumberByTenantId(tenantId) + 1;
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

    public OrderDisputeResponse createDispute(UUID orderId, CreateOrderDisputeRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        OrderDispute dispute = new OrderDispute();
        dispute.setOrder(order);
        dispute.setTenant(order.getTenant());
        dispute.setIssueType(request.issueType().trim().toUpperCase(Locale.ROOT));
        dispute.setDetails(request.details().trim());
        dispute.setCustomerName(trimToNull(request.customerName()));
        dispute.setCustomerPhone(trimToNull(request.customerPhone()));
        dispute.setStatus("OPEN");
        return toDisputeResponse(orderDisputeRepository.save(dispute));
    }

    public PageResponse<OrderDisputeResponse> getDisputes(UUID tenantId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<OrderDispute> disputes = orderDisputeRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        Page<OrderDisputeResponse> mapped = disputes.map(this::toDisputeResponse);
        return PageResponse.from(mapped);
    }

    public PageResponse<OrderResponse> adminSearchOrders(
            UUID tenantId,
            OrderStatus status,
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive,
            String query,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Order> results = orderRepository.adminSearch(
                tenantId,
                status,
                fromInclusive,
                toExclusive,
                trimToNull(query),
                pageable
        );
        Page<OrderResponse> mapped = results.map(this::toResponse);
        return PageResponse.from(mapped);
    }

    public byte[] generateInvoicePdf(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            // Font styles
            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 18);
            com.lowagie.text.Font headerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 12);
            com.lowagie.text.Font normalFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 10);

            // Title
            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("TAX INVOICE", titleFont);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(title);
            com.lowagie.text.Paragraph platformTag = new com.lowagie.text.Paragraph("Generated via DineOps", normalFont);
            platformTag.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(platformTag);
            document.add(new com.lowagie.text.Paragraph(" "));

            // Core invoice fields
            String invoiceNumberText = order.getInvoiceNumber() == null
                    ? String.valueOf(order.getId())
                    : String.format("INV-%s-%06d", order.getTenant().getId().toString().substring(0, 6).toUpperCase(), order.getInvoiceNumber());
            LocalDateTime invoiceDateTime = order.getCreatedAt() == null ? LocalDateTime.now() : order.getCreatedAt();
            document.add(new com.lowagie.text.Paragraph("Invoice No: " + invoiceNumberText, headerFont));
            document.add(new com.lowagie.text.Paragraph("Invoice Date: " + invoiceDateTime.format(INVOICE_DATE_TIME_FORMATTER), normalFont));
            document.add(new com.lowagie.text.Paragraph("Order ID: " + order.getId(), normalFont));
            document.add(new com.lowagie.text.Paragraph(" "));

            // Supplier details
            document.add(new com.lowagie.text.Paragraph("Supplier Details", headerFont));
            document.add(new com.lowagie.text.Paragraph("Restaurant: " + firstNonEmpty(order.getTenant().getName(), "N/A"), normalFont));
            document.add(new com.lowagie.text.Paragraph("Address: " + firstNonEmpty(order.getTenant().getAddress(), "N/A"), normalFont));
            if (order.getTenant().getFssaiLicense() != null) 
                document.add(new com.lowagie.text.Paragraph("FSSAI: " + order.getTenant().getFssaiLicense(), normalFont));
            document.add(new com.lowagie.text.Paragraph("GSTIN: " + firstNonEmpty(order.getTenant().getGstNumber(), "UNREGISTERED"), normalFont));
            document.add(new com.lowagie.text.Paragraph("Place of Supply: " + firstNonEmpty(order.getTenant().getAddress(), "N/A"), normalFont));
            document.add(new com.lowagie.text.Paragraph("Service Accounting Code (SAC): " + SAC_CODE_RESTAURANT_SERVICE, normalFont));
            document.add(new com.lowagie.text.Paragraph(" "));

            // Buyer details
            document.add(new com.lowagie.text.Paragraph("Buyer Details", headerFont));
            document.add(new com.lowagie.text.Paragraph("Customer: " + firstNonEmpty(order.getCustomerName(), "Walk-in customer"), normalFont));
            document.add(new com.lowagie.text.Paragraph("Phone: " + firstNonEmpty(order.getCustomerPhone(), "N/A"), normalFont));
            document.add(new com.lowagie.text.Paragraph(" "));

            // Items Table with line-level GST breakup
            int gstPercent = resolveGstPercent(order);
            double halfGstRatePercent = gstPercent / 2.0;

            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{3.4f, 1.4f, 0.9f, 1.3f, 1.4f, 1.2f, 1.2f, 1.4f});
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Item Name", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("SAC", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Qty", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Rate", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Taxable", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("CGST " + halfGstRatePercent + "%", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("SGST " + halfGstRatePercent + "%", headerFont)));
            table.addCell(new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Line Total", headerFont)));

            for (OrderItem item : order.getItems()) {
                long lineTotalPaise = (long) item.getPrice() * item.getQuantity();
                long[] lineSplit = splitInclusiveTax(lineTotalPaise, gstPercent);
                long lineTaxablePaise = lineSplit[0];
                long lineGstPaise = lineSplit[1];
                long lineCgstPaise = lineSplit[2];
                long lineSgstPaise = lineSplit[3];

                table.addCell(new com.lowagie.text.Phrase(item.getName(), normalFont));
                table.addCell(new com.lowagie.text.Phrase(SAC_CODE_RESTAURANT_SERVICE, normalFont));
                table.addCell(new com.lowagie.text.Phrase(String.valueOf(item.getQuantity()), normalFont));
                table.addCell(new com.lowagie.text.Phrase(toInr(item.getPrice()), normalFont));
                table.addCell(new com.lowagie.text.Phrase(toInr(lineTaxablePaise), normalFont));
                table.addCell(new com.lowagie.text.Phrase(toInr(lineCgstPaise), normalFont));
                table.addCell(new com.lowagie.text.Phrase(toInr(lineSgstPaise), normalFont));
                table.addCell(new com.lowagie.text.Phrase(toInr(lineTotalPaise), normalFont));
            }
            document.add(table);
            document.add(new com.lowagie.text.Paragraph(" "));
            document.add(new com.lowagie.text.Paragraph("Line-level tax values are derived using the invoice GST rate.", normalFont));
            document.add(new com.lowagie.text.Paragraph(" "));

            // Totals with GST breakup (CGST + SGST)
            int totalPaise = order.getTotalAmount();
            long[] totalSplit = splitInclusiveTax(totalPaise, gstPercent);
            long taxableAmountPaise = totalSplit[0];
            long gstAmountPaise = totalSplit[1];
            long cgstPaise = totalSplit[2];
            long sgstPaise = totalSplit[3];

            document.add(new com.lowagie.text.Paragraph("Taxable Amount: INR " + toInr(taxableAmountPaise), normalFont));
            document.add(new com.lowagie.text.Paragraph("CGST (" + (gstPercent / 2.0) + "%): INR " + toInr(cgstPaise), normalFont));
            document.add(new com.lowagie.text.Paragraph("SGST (" + (gstPercent / 2.0) + "%): INR " + toInr(sgstPaise), normalFont));
            document.add(new com.lowagie.text.Paragraph("GST Total (" + gstPercent + "%): INR " + toInr(gstAmountPaise), normalFont));
            document.add(new com.lowagie.text.Paragraph("Invoice Total: INR " + toInr(totalPaise), headerFont));
            document.add(new com.lowagie.text.Paragraph(" "));
            
            document.add(new com.lowagie.text.Paragraph("Payment Method: " + order.getPaymentMethod(), normalFont));
            document.add(new com.lowagie.text.Paragraph("Payment Status: " + order.getPaymentStatus(), normalFont));
            document.add(new com.lowagie.text.Paragraph(" "));
            document.add(new com.lowagie.text.Paragraph("Compliance note: Verify GST treatment and filing applicability for your jurisdiction with your CA.", normalFont));
            document.add(new com.lowagie.text.Paragraph("System-generated invoice. Signature not required.", normalFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for order {}: {}", orderId, e.getMessage());
            return "Error generating PDF".getBytes(StandardCharsets.UTF_8);
        }
    }

    @Async("invoiceTaskExecutor")
    public CompletableFuture<byte[]> generateInvoicePdfAsync(UUID orderId) {
        return CompletableFuture.completedFuture(generateInvoicePdf(orderId));
    }

    private boolean isTransitionAllowed(OrderStatus from, OrderStatus to) {
        return ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    private int resolveGstPercent(Order order) {
        int nonAcRate = order.getTenant().getGstRateNonAcPercent() == null ? 5 : order.getTenant().getGstRateNonAcPercent();
        int acRate = order.getTenant().getGstRateAcPercent() == null ? 18 : order.getTenant().getGstRateAcPercent();
        if (order.getDiningZone() != null && order.getDiningZone().isAirConditioned()) {
            return acRate;
        }
        return nonAcRate;
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

    private static String toInr(long paise) {
        return String.format("%.2f", paise / 100.0);
    }

    private static long[] splitInclusiveTax(long grossPaise, int gstPercent) {
        if (gstPercent <= 0) {
            return new long[]{grossPaise, 0L, 0L, 0L};
        }
        BigDecimal gross = BigDecimal.valueOf(grossPaise);
        BigDecimal taxable = gross.multiply(BigDecimal.valueOf(100L))
                .divide(BigDecimal.valueOf(100L + gstPercent), 0, RoundingMode.HALF_UP);
        long taxablePaise = taxable.longValue();
        long gstPaise = grossPaise - taxablePaise;
        long cgstPaise = gstPaise / 2;
        long sgstPaise = gstPaise - cgstPaise;
        return new long[]{taxablePaise, gstPaise, cgstPaise, sgstPaise};
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
        LocalDateTime changedAfterInclusive = LocalDateTime.now().minusDays(HISTORICAL_PREP_LOOKBACK_DAYS);
        List<OrderStatusHistory> history = orderStatusHistoryRepository
            .findByOrderTenantIdAndChangedAtGreaterThanEqualOrderByChangedAtAsc(tenantId, changedAfterInclusive);
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

    private OrderDisputeResponse toDisputeResponse(OrderDispute dispute) {
        return new OrderDisputeResponse(
                dispute.getId(),
                dispute.getOrder().getId(),
                dispute.getTenant().getId(),
                dispute.getIssueType(),
                dispute.getDetails(),
                dispute.getCustomerName(),
                dispute.getCustomerPhone(),
                dispute.getStatus(),
                dispute.getCreatedAt()
        );
    }

    private void publishRealtimeUpdate(OrderResponse response) {
        if (messagingTemplate == null || response == null) {
            return;
        }
        messagingTemplate.convertAndSend("/topic/orders/" + response.tenantId(), response);
        messagingTemplate.convertAndSend("/topic/order/" + response.id(), response);
    }
}