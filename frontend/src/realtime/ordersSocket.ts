import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { Order } from '../types/order'
import { tokenStore } from '../auth/tokenStore'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const wsBase = apiUrl.startsWith('http') ? apiUrl.replace(/\/$/, '') : window.location.origin
const wsUrl = `${wsBase}/ws`

function createConnectHeaders(): Record<string, string> {
  const token = tokenStore.getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const subscribeTenantOrders = (
  tenantId: string,
  onMessage: (order: Order) => void,
  onError: () => void
): (() => void) => {
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: createConnectHeaders(),
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
    connectHeaders: createConnectHeaders(),
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
