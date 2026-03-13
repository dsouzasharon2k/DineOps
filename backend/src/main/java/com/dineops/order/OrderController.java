package com.dineops.order;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
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
    public ResponseEntity<Order> placeOrder(@RequestBody PlaceOrderRequest request) {
        Order order = orderService.placeOrder(request);
        return ResponseEntity.status(201).body(order);
    }

    // GET /api/v1/orders?tenantId=xxx - get all orders for a restaurant
    @GetMapping
    public ResponseEntity<List<Order>> getOrders(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(orderService.getOrdersByTenant(tenantId));
    }

    // GET /api/v1/orders/active?tenantId=xxx - get active orders (kitchen view)
    @GetMapping("/active")
    public ResponseEntity<List<Order>> getActiveOrders(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(orderService.getActiveOrders(tenantId));
    }

    // PATCH /api/v1/orders/{orderId}/status - update order status
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<Order> updateStatus(
            @PathVariable UUID orderId,
            @RequestBody Map<String, String> body) {
        OrderStatus newStatus = OrderStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(orderService.updateStatus(orderId, newStatus));
    }
}