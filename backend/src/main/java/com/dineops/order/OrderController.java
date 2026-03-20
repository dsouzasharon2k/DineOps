package com.dineops.order;

import com.dineops.dto.PageResponse;
import com.dineops.dto.OrderResponse;
import com.dineops.dto.OrderStatusHistoryResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
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
}