import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { Order } from '../types/order'

const wsUrl = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/ws`

export const subscribeTenantOrders = (
  tenantId: string,
  onMessage: (order: Order) => void,
  onError: () => void
): (() => void) => {
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    reconnectDelay: 0,
    onConnect: () => {
      client.subscribe(`/topic/orders/${tenantId}`, (message) => {
        const payload = JSON.parse(message.body) as Order
        onMessage(payload)
      })
    },
    onStompError: () => onError(),
    onWebSocketError: () => onError(),
  })
  client.activate()
  return () => client.deactivate()
}

export const subscribeOrderStatus = (
  orderId: string,
  onMessage: (order: Order) => void,
  onError: () => void
): (() => void) => {
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    reconnectDelay: 0,
    onConnect: () => {
      client.subscribe(`/topic/order/${orderId}`, (message) => {
        const payload = JSON.parse(message.body) as Order
        onMessage(payload)
      })
    },
    onStompError: () => onError(),
    onWebSocketError: () => onError(),
  })
  client.activate()
  return () => client.deactivate()
}
