// React hook that wraps cartStore with state management
// Components use this hook to interact with the cart

import { useState } from 'react';
import { cartStore } from '../store/cartStore';
import type { Cart, CartItem } from '../store/cartStore';

export function useCart(tenantId: string) {
  const [cart, setCart] = useState<Cart | null>(() => {
    const stored = cartStore.getCart();
    // Only use stored cart if it's for the same restaurant
    return stored?.tenantId === tenantId ? stored : null;
  });

  const tenantCart = cart?.tenantId === tenantId ? cart : null;

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    const updated = cartStore.addItem(tenantId, item);
    setCart(updated);
  };

  const removeItem = (menuItemId: string) => {
    const updated = cartStore.removeItem(menuItemId);
    setCart(updated);
  };

  const clearCart = () => {
    cartStore.clearCart();
    setCart(null);
  };

  const getQuantity = (menuItemId: string): number => {
    return tenantCart?.items.find(i => i.menuItemId === menuItemId)?.quantity ?? 0;
  };

  const total = tenantCart ? cartStore.getTotal(tenantCart) : 0;
  const itemCount = tenantCart ? cartStore.getItemCount(tenantCart) : 0;

  return { cart: tenantCart, addItem, removeItem, clearCart, getQuantity, total, itemCount };
}

