// Reactive cart store with Zustand — per-tenant isolation, localStorage persistence

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  menuItemId: string
  name: string
  price: number // in paise
  quantity: number
  isVegetarian: boolean
}

export interface Cart {
  tenantId: string
  items: CartItem[]
}

interface CartState {
  cart: Cart | null
  addItem: (tenantId: string, item: Omit<CartItem, 'quantity'>) => void
  removeItem: (menuItemId: string) => void
  clearCart: () => void
}

function getTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function getItemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,

      addItem: (tenantId, item) =>
        set((state) => {
          const existing = state.cart
          let cart: Cart
          if (!existing || existing.tenantId !== tenantId) {
            cart = { tenantId, items: [] }
          } else {
            cart = { ...existing, items: [...existing.items] }
          }
          const idx = cart.items.findIndex((i) => i.menuItemId === item.menuItemId)
          if (idx >= 0) {
            cart.items[idx] = { ...cart.items[idx], quantity: cart.items[idx].quantity + 1 }
          } else {
            cart.items.push({ ...item, quantity: 1 })
          }
          return { cart }
        }),

      removeItem: (menuItemId) =>
        set((state) => {
          const cart = state.cart
          if (!cart) return state
          const existingItem = cart.items.find((i) => i.menuItemId === menuItemId)
          if (!existingItem) return state
          let newItems: CartItem[]
          if (existingItem.quantity === 1) {
            newItems = cart.items.filter((i) => i.menuItemId !== menuItemId)
          } else {
            newItems = cart.items.map((i) =>
              i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
            )
          }
          return { cart: { ...cart, items: newItems } }
        }),

      clearCart: () => set({ cart: null }),
    }),
    { name: 'dineops-cart', partialize: (s) => ({ cart: s.cart }) }
  )
)

// Export helpers for use in hooks
export { getTotal, getItemCount }
