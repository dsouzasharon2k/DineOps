package com.platterops.notification;

import com.platterops.order.Order;
import com.platterops.order.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public void sendOrderPlacedNotification(Order order) {
        if (order == null) {
            return;
        }
        if (order.getTenant().isNotifyCustomerEmail() && order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
            log.info("notification_email orderId={} to={} template=order_placed", order.getId(), order.getCustomerEmail());
        }
        if (order.getTenant().isNotifyCustomerSms() && order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) {
            log.info("notification_sms orderId={} to={} template=order_placed", order.getId(), order.getCustomerPhone());
        }
    }

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
        }
        if (order.getTenant().isNotifyCustomerSms() && order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) {
            log.info("notification_sms orderId={} to={} template=status_{} from={}",
                    order.getId(), order.getCustomerPhone(), toStatus.name().toLowerCase(), fromStatus);
        }
    }
}
