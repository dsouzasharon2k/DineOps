package com.platterops.order;

import com.platterops.dto.KitchenBatchResponse;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/kitchen")
public class KitchenController {

    private final OrderService orderService;

    public KitchenController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/batches")
    public List<KitchenBatchResponse> getKitchenBatches(@RequestParam UUID tenantId) {
        List<Order> activeOrders = orderService.getActiveOrders(tenantId);
        
        // Filter for orders that are actually being prepared or confirmed
        List<Order> preppingOrders = activeOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CONFIRMED || o.getStatus() == OrderStatus.PREPARING)
                .toList();

        Map<UUID, List<OrderItem>> groupedByItem = preppingOrders.stream()
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getMenuItem() != null)
                .collect(Collectors.groupingBy(i -> i.getMenuItem().getId()));

        return groupedByItem.entrySet().stream()
                .map(entry -> {
                    UUID itemId = entry.getKey();
                    List<OrderItem> items = entry.getValue();
                    String itemName = items.get(0).getName();
                    long totalQty = items.stream().mapToLong(OrderItem::getQuantity).sum();
                    long orderCount = items.stream().map(i -> i.getOrder().getId()).distinct().count();
                    
                    long maxWait = items.stream()
                            .mapToLong(i -> java.time.Duration.between(i.getOrder().getCreatedAt(), java.time.LocalDateTime.now()).toMinutes())
                            .max().orElse(0);
                    
                    // Simple priority algorithm: wait time + item popularity
                    double priority = maxWait * 1.5 + orderCount * 2.0;

                    return new KitchenBatchResponse(itemId, itemName, totalQty, orderCount, priority, maxWait);
                })
                .sorted(Comparator.comparingDouble(KitchenBatchResponse::priority).reversed())
                .toList();
    }
}
