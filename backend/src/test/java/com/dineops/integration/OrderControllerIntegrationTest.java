package com.dineops.integration;

import com.dineops.dto.OrderItemResponse;
import com.dineops.dto.OrderResponse;
import com.dineops.order.OrderService;
import com.dineops.order.OrderStatus;
import com.dineops.order.PaymentMethod;
import com.dineops.order.PaymentStatus;
import com.dineops.security.AccountLockoutService;
import com.dineops.security.RateLimitService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class OrderControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @MockBean
    private RateLimitService rateLimitService;

    @MockBean
    private AccountLockoutService accountLockoutService;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @Test
    void placeOrder_validPayload_returnsCreatedOrder() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID menuItemId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        OrderResponse response = new OrderResponse(
                orderId,
                tenantId,
                null,
                null,
                OrderStatus.PENDING,
                PaymentStatus.UNPAID,
                PaymentMethod.CASH,
                50000,
                "Less spicy",
                List.of(new OrderItemResponse(
                        UUID.randomUUID(),
                        menuItemId,
                        "Paneer Biryani",
                        25000,
                        2,
                        now,
                        now
                )),
                now,
                now
        );

        when(orderService.placeOrderResponse(any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "tenantId": "%s",
                                  "notes": "Less spicy",
                                  "items": [
                                    { "menuItemId": "%s", "quantity": 2 }
                                  ]
                                }
                                """.formatted(tenantId, menuItemId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(orderId.toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalAmount").value(50000));
    }

    @Test
    void getOrder_existingId_returnsOrderDetails() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        OrderResponse response = new OrderResponse(
                orderId,
                tenantId,
                null,
                null,
                OrderStatus.CONFIRMED,
                PaymentStatus.PAID,
                PaymentMethod.ONLINE,
                30000,
                null,
                List.of(),
                now,
                now
        );
        when(orderService.getOrderResponseById(orderId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/orders/{orderId}", orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderId.toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.tenantId").value(tenantId.toString()));
    }
}
