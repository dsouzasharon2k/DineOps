// Cart store using localStorage for persistence
// Cart is per-tenant (restaurant) - switching restaurants clears the cart

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number; // in paise
  quantity: number;
  isVegetarian: boolean;
}

export interface Cart {
  tenantId: string;
  items: CartItem[];
}

const CART_KEY = 'dineops_cart';

export const cartStore = {
  // Get current cart from localStorage
  getCart(): Cart | null {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  // Save cart to localStorage
  saveCart(cart: Cart): void {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  },

  // Add item to cart - if different restaurant, clear cart first
  addItem(tenantId: string, item: Omit<CartItem, 'quantity'>): Cart {
    const existing = this.getCart();

    // If cart belongs to different restaurant, start fresh
    let cart: Cart;
    if (!existing || existing.tenantId !== tenantId) {
      cart = { tenantId, items: [] };
    } else {
      cart = existing;
    }

    const existingItem = cart.items.find(i => i.menuItemId === item.menuItemId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({ ...item, quantity: 1 });
    }

    this.saveCart(cart);
    return cart;
  },

  // Remove one unit of an item
  removeItem(menuItemId: string): Cart | null {
    const cart = this.getCart();
    if (!cart) return null;

    const existingItem = cart.items.find(i => i.menuItemId === menuItemId);
    if (!existingItem) return cart;

    if (existingItem.quantity === 1) {
      cart.items = cart.items.filter(i => i.menuItemId !== menuItemId);
    } else {
      existingItem.quantity -= 1;
    }

    this.saveCart(cart);
    return cart;
  },

  // Clear entire cart
  clearCart(): void {
    localStorage.removeItem(CART_KEY);
  },

  // Get total price in paise
  getTotal(cart: Cart): number {
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Get total item count
  getItemCount(cart: Cart): number {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }
};

