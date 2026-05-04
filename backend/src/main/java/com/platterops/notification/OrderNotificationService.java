package com.platterops.notification;

import com.platterops.order.Order;
import com.platterops.order.OrderStatus;

public interface OrderNotificationService {
    void sendOrderPlacedNotification(Order order);
    void sendOrderStatusNotification(Order order, OrderStatus fromStatus, OrderStatus toStatus);
}
