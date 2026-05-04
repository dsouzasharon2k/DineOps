package com.platterops.notification;

import com.platterops.order.Order;
import com.platterops.order.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class NotificationService implements OrderNotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final SmsGatewayService smsGatewayService;
    private final EmailGatewayService emailGatewayService;

    public NotificationService(SmsGatewayService smsGatewayService, EmailGatewayService emailGatewayService) {
        this.smsGatewayService = smsGatewayService;
        this.emailGatewayService = emailGatewayService;
    }

    @Override
    @Async("notificationTaskExecutor")
    public void sendOrderPlacedNotification(Order order) {
        if (order == null) {
            return;
        }
        if (order.getTenant().isNotifyCustomerEmail() && order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
            log.info("notification_email orderId={} to={} template=order_placed", order.getId(), order.getCustomerEmail());
            emailGatewayService.send(
                    order.getCustomerEmail(),
                    "Order placed successfully",
                    "Your order " + order.getId() + " has been placed successfully.",
                    "order_placed"
            );
        }
        if (order.getTenant().isNotifyCustomerSms() && order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) {
            log.info("notification_sms orderId={} to={} template=order_placed", order.getId(), order.getCustomerPhone());
            smsGatewayService.send(
                    order.getCustomerPhone(),
                    "Your DineOps order " + order.getId() + " was placed successfully.",
                    "order_placed"
            );
        }
    }

    @Override
    @Async("notificationTaskExecutor")
    public void sendOrderStatusNotification(Order order, OrderStatus fromStatus, OrderStatus toStatus) {
        if (order == null || toStatus == null) {
            return;
        }
        if (toStatus != OrderStatus.CONFIRMED && toStatus != OrderStatus.READY) {
            return;
        }
        if (order.getTenant().isNotifyCustomerEmail() && order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
            log.info("notification_email orderId={} to={} template=status_{} from={}",
                    order.getId(), order.getCustomerEmail(), toStatus.name().toLowerCase(), fromStatus);
            String emailBody = toStatus == OrderStatus.CONFIRMED
                ? "Your order " + order.getId() + " is CONFIRMED and being prepared."
                : "Your order " + order.getId() + " is READY for pickup.";
            emailGatewayService.send(
                order.getCustomerEmail(),
                "Order status update: " + toStatus.name(),
                emailBody,
                "status_" + toStatus.name().toLowerCase()
            );
        }
        if (order.getTenant().isNotifyCustomerSms() && order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) {
            log.info("notification_sms orderId={} to={} template=status_{} from={}",
                    order.getId(), order.getCustomerPhone(), toStatus.name().toLowerCase(), fromStatus);
            String statusText = toStatus == OrderStatus.CONFIRMED
                    ? "Your order " + order.getId() + " is CONFIRMED. We have started processing it."
                    : "Your order " + order.getId() + " is READY. Please collect it.";
            smsGatewayService.send(order.getCustomerPhone(), statusText, null);
        }
    }
}
