package com.dineops.order;

import com.dineops.dto.PageResponse;
import com.dineops.dto.OrderResponse;
import com.dineops.dto.OrderStatusHistoryResponse;
import com.dineops.dto.InitiatePaymentRequest;
import com.dineops.dto.InitiatePaymentResponse;
import com.dineops.dto.PaymentWebhookRequest;
import com.dineops.dto.CreateReviewRequest;
import com.dineops.dto.ReviewResponse;
import com.dineops.review.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.Objects;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final ReviewService reviewService;

    public OrderController(OrderService orderService, ReviewService reviewService) {
        this.orderService = orderService;
        this.reviewService = reviewService;
    }

    // POST /api/v1/orders - place a new order (public - no login needed)
    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(@RequestBody @Valid PlaceOrderRequest request) {
        OrderResponse order = orderService.placeOrderResponse(request);
        return ResponseEntity.status(201).body(order);
    }

    // GET /api/v1/orders/{orderId} - get single order (public - for customer status tracking)
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrderResponseById(orderId));
    }

    @GetMapping("/{orderId}/history")
    public ResponseEntity<java.util.List<OrderStatusHistoryResponse>> getOrderHistory(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getStatusHistory(orderId));
    }

    // GET /api/v1/orders?tenantId=xxx - get all orders for a restaurant
    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getOrders(
            @RequestParam UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(PageResponse.from(orderService.getOrderResponsesByTenant(tenantId, page, size)));
    }

    @GetMapping("/lookup")
    public ResponseEntity<java.util.List<OrderResponse>> lookupOrdersByPhone(
            @RequestParam UUID tenantId,
            @RequestParam String phone) {
        return ResponseEntity.ok(orderService.lookupRecentOrdersByPhone(tenantId, phone));
    }

    // GET /api/v1/orders/active?tenantId=xxx - get active orders (kitchen view)
    @GetMapping("/active")
    public ResponseEntity<PageResponse<OrderResponse>> getActiveOrders(
            @RequestParam UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(PageResponse.from(orderService.getActiveOrderResponses(tenantId, page, size)));
    }

    // PATCH /api/v1/orders/{orderId}/status - update order status
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable UUID orderId,
            @RequestBody Map<String, String> body) {
        OrderStatus newStatus = OrderStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(orderService.updateStatusResponse(orderId, newStatus));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> customerCancelOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.customerCancelOrder(orderId));
    }

    @PostMapping("/{orderId}/pay")
    public ResponseEntity<InitiatePaymentResponse> initiatePayment(
            @PathVariable UUID orderId,
            @RequestBody @Valid InitiatePaymentRequest request) {
        return ResponseEntity.ok(orderService.initiatePayment(orderId, request.paymentMethod()));
    }

    @PostMapping("/{orderId}/review")
    public ResponseEntity<ReviewResponse> submitReview(
            @PathVariable UUID orderId,
            @RequestBody @Valid CreateReviewRequest request
    ) {
        return ResponseEntity.status(201).body(reviewService.createOrderReview(orderId, request));
    }

    @GetMapping("/{orderId}/review")
    public ResponseEntity<ReviewResponse> getReview(@PathVariable UUID orderId) {
        return ResponseEntity.ok(reviewService.getOrderReview(orderId));
    }

    @PostMapping("/payments/webhook")
    public ResponseEntity<OrderResponse> paymentWebhook(@RequestBody @Valid PaymentWebhookRequest request) {
        return ResponseEntity.ok(orderService.handlePaymentWebhook(
                request.providerOrderRef(),
                request.providerPaymentRef(),
                request.success()
        ));
    }

    @GetMapping("/{orderId}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable UUID orderId) {
        byte[] invoiceBytes = orderService.generateInvoicePdf(orderId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + orderId + ".pdf")
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_PDF))
                .body(invoiceBytes);
    }
}