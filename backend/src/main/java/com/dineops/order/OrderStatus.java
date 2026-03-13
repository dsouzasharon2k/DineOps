package com.dineops.order;

// Represents the lifecycle of an order in the kitchen
// PENDING → CONFIRMED → PREPARING → READY → DELIVERED
// At any point it can be CANCELLED
public enum OrderStatus {
    PENDING,    // Order placed, waiting for restaurant to confirm
    CONFIRMED,  // Restaurant confirmed the order
    PREPARING,  // Kitchen is preparing the order
    READY,      // Order is ready for pickup/delivery
    DELIVERED,  // Order has been delivered
    CANCELLED   // Order was cancelled
}