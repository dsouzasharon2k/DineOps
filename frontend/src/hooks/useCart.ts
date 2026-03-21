// React hook wrapping useCartStore with tenant-scoped cart API

import { useCartStore, getTotal, getItemCount } from '../store/cartStore'
import type { CartItem } from '../store/cartStore'

export function useCart(tenantId: string) {
  const cart = useCartStore((s) => s.cart)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)

  const tenantCart = cart?.tenantId === tenantId ? cart : null

  const getQuantity = (menuItemId: string): number =>
    tenantCart?.items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0

  const total = tenantCart ? getTotal(tenantCart) : 0
  const itemCount = tenantCart ? getItemCount(tenantCart) : 0

  return {
    cart: tenantCart,
    addItem: (item: Omit<CartItem, 'quantity'>) => addItem(tenantId, item),
    removeItem,
    clearCart,
    getQuantity,
    total,
    itemCount,
  }
}
