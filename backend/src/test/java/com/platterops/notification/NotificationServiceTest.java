package com.platterops.notification;

import com.platterops.order.Order;
import com.platterops.order.OrderStatus;
import com.platterops.restaurant.Restaurant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class NotificationServiceTest {

    private SmsGatewayService smsGatewayService;
    private EmailGatewayService emailGatewayService;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        smsGatewayService = Mockito.mock(SmsGatewayService.class);
        emailGatewayService = Mockito.mock(EmailGatewayService.class);
        notificationService = new NotificationService(smsGatewayService, emailGatewayService);
    }

    @Test
    void sendOrderPlacedNotification_shouldSendEmailAndSmsWhenEnabled() {
        Order order = buildOrder(true, true);

        notificationService.sendOrderPlacedNotification(order);

        verify(emailGatewayService).send(
                order.getCustomerEmail(),
                "Order placed successfully",
                "Your order " + order.getId() + " has been placed successfully.",
                "order_placed"
        );
        verify(smsGatewayService).send(order.getCustomerPhone(), "Your DineOps order " + order.getId() + " was placed successfully.", "order_placed");
    }

    @Test
    void sendOrderStatusNotification_shouldSkipForNonTrackedStatus() {
        Order order = buildOrder(true, true);

        notificationService.sendOrderStatusNotification(order, OrderStatus.PENDING, OrderStatus.CANCELLED);

        verifyNoInteractions(emailGatewayService);
        verifyNoInteractions(smsGatewayService);
    }

    private Order buildOrder(boolean emailEnabled, boolean smsEnabled) {
        Restaurant tenant = new Restaurant();
        tenant.setNotifyCustomerEmail(emailEnabled);
        tenant.setNotifyCustomerSms(smsEnabled);

        Order order = new Order();
        ReflectionTestUtils.setField(order, "id", java.util.UUID.randomUUID());
        order.setTenant(tenant);
        order.setCustomerEmail("owner@dineops.com");
        order.setCustomerPhone("9999999999");
        return order;
    }
}
