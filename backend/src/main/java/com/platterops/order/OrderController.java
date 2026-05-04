package com.platterops.order;

import com.platterops.dto.PageResponse;
import com.platterops.dto.OrderDisputeResponse;
import com.platterops.dto.OrderResponse;
import com.platterops.dto.OrderStatusHistoryResponse;
import com.platterops.dto.InitiatePaymentRequest;
import com.platterops.dto.InitiatePaymentResponse;
import com.platterops.dto.PaymentWebhookRequest;
import com.platterops.dto.CreateReviewRequest;
import com.platterops.dto.ReviewResponse;
import com.platterops.review.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Objects;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.platterops.security.RateLimitService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.RequestHeader;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final ReviewService reviewService;
    private final RateLimitService rateLimitService;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.payment.provider:mock}")
    private String paymentProvider;

    @Value("${app.payment.razorpay.webhook-secret:}")
    private String razorpayWebhookSecret;

    @Value("${app.payment.webhook-shared-secret:}")
    private String webhookSharedSecret;

    private final Environment environment;

    public OrderController(OrderService orderService, ReviewService reviewService, RateLimitService rateLimitService, Environment environment) {
        this.orderService = orderService;
        this.reviewService = reviewService;
        this.rateLimitService = rateLimitService;
        this.environment = environment;
    }

    // POST /api/v1/orders - place a new order (public - no login needed)
    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(@RequestBody @Valid PlaceOrderRequest request) {
        // Rate limit by customer phone to mitigate spam/abuse
        String phone = request.customerPhone();
        String key = phone != null ? "order:phone:" + phone : "order:anon";
        boolean allowed = rateLimitService.isAllowed(key, 10, java.time.Duration.ofMinutes(1));
        if (!allowed) {
            return ResponseEntity.status(429).build();
        }
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

    @GetMapping("/admin/search")
    public ResponseEntity<PageResponse<OrderResponse>> adminSearchOrders(
            @RequestParam(required = false) UUID tenantId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        ensureSuperAdmin();
        LocalDateTime fromInclusive = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime toExclusive = toDate == null ? null : toDate.plusDays(1).atStartOfDay();
        return ResponseEntity.ok(orderService.adminSearchOrders(tenantId, status, fromInclusive, toExclusive, query, page, size));
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
            @RequestBody @Valid UpdateOrderStatusRequest request) {
        return ResponseEntity.ok(orderService.updateStatusResponse(orderId, request.status()));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> customerCancelOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.customerCancelOrder(orderId));
    }

    @PostMapping("/{orderId}/disputes")
    public ResponseEntity<OrderDisputeResponse> createDispute(
            @PathVariable UUID orderId,
            @RequestBody @Valid CreateOrderDisputeRequest request) {
        return ResponseEntity.status(201).body(orderService.createDispute(orderId, request));
    }

    @GetMapping("/disputes")
    public ResponseEntity<PageResponse<OrderDisputeResponse>> getDisputes(
            @RequestParam UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(orderService.getDisputes(tenantId, page, size));
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
    public ResponseEntity<OrderResponse> paymentWebhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            @RequestBody String rawBody) {
        try {
            boolean isProdProfile = java.util.Arrays.stream(environment.getActiveProfiles())
                    .anyMatch(profile -> "prod".equalsIgnoreCase(profile));
            if (isProdProfile && !"razorpay".equalsIgnoreCase(paymentProvider)) {
                return ResponseEntity.status(403).build();
            }
            if ("razorpay".equalsIgnoreCase(paymentProvider)) {
                if (razorpayWebhookSecret == null || razorpayWebhookSecret.isBlank()) {
                    return ResponseEntity.status(403).build();
                }
                if (signature == null || signature.isBlank()) {
                    return ResponseEntity.status(403).build();
                }
                // verify HMAC SHA256 hex
                Mac mac = Mac.getInstance("HmacSHA256");
                SecretKeySpec secretKey = new SecretKeySpec(razorpayWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
                mac.init(secretKey);
                byte[] digest = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                for (byte b : digest) {
                    sb.append(String.format("%02x", b));
                }
                String computed = sb.toString().toLowerCase(Locale.ROOT);
                if (!computed.equals(signature.toLowerCase(Locale.ROOT))) {
                    return ResponseEntity.status(403).build();
                }
            } else {
                if (webhookSharedSecret == null || webhookSharedSecret.isBlank()) {
                    return ResponseEntity.status(403).build();
                }
                if (webhookSecret == null || webhookSecret.isBlank()) {
                    return ResponseEntity.status(403).build();
                }
                byte[] expected = webhookSharedSecret.getBytes(StandardCharsets.UTF_8);
                byte[] actual = webhookSecret.getBytes(StandardCharsets.UTF_8);
                if (!MessageDigest.isEqual(expected, actual)) {
                    return ResponseEntity.status(403).build();
                }
            }
            PaymentWebhookRequest request = objectMapper.readValue(rawBody, PaymentWebhookRequest.class);
            return ResponseEntity.ok(orderService.handlePaymentWebhook(
                    request.providerOrderRef(),
                    request.providerPaymentRef(),
                    request.success()
            ));
        } catch (com.fasterxml.jackson.core.JsonProcessingException jex) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.status(409).build();
        } catch (Exception ex) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{orderId}/invoice")
    public CompletableFuture<ResponseEntity<byte[]>> downloadInvoice(@PathVariable UUID orderId) {
        return orderService.generateInvoicePdfAsync(orderId)
                .thenApply(invoiceBytes -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + orderId + ".pdf")
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_PDF))
                        .body(invoiceBytes));
    }

    private void ensureSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities().stream().noneMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()))) {
            throw new AccessDeniedException("Super admin role required.");
        }
    }
}