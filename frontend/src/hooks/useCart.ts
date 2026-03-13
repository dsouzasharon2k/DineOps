// React hook that wraps cartStore with state management
// Components use this hook to interact with the cart

import { useState, useEffect } from 'react';
import { cartStore } from '../store/cartStore';
import type { Cart, CartItem } from '../store/cartStore';

export function useCart(tenantId: string) {
  const [cart, setCart] = useState<Cart | null>(() => {
    const stored = cartStore.getCart();
    // Only use stored cart if it's for the same restaurant
    return stored?.tenantId === tenantId ? stored : null;
  });

  // Sync cart state when tenantId changes
  useEffect(() => {
    const stored = cartStore.getCart();
    setCart(stored?.tenantId === tenantId ? stored : null);
  }, [tenantId]);

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
    return cart?.items.find(i => i.menuItemId === menuItemId)?.quantity ?? 0;
  };

  const total = cart ? cartStore.getTotal(cart) : 0;
  const itemCount = cart ? cartStore.getItemCount(cart) : 0;

  return { cart, addItem, removeItem, clearCart, getQuantity, total, itemCount };
}

