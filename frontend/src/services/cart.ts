import type { Product } from '../types';

export type CartLine = {
  productId: string;
  quantity: number;
  product: Product;
};

export function getCartItemCount(cart: CartLine[]): number {
  return cart.reduce((total, item) => total + Math.max(0, item.quantity), 0);
}

export function upsertCartItem(cart: CartLine[], product: Product, quantity: number): CartLine[] {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const stock = product.stock ?? Number.MAX_SAFE_INTEGER;
  if (stock < 1) return cart;
  const index = cart.findIndex((item) => item.productId === product._id);

  if (index >= 0) {
    const next = [...cart];
    next[index] = {
      ...next[index],
      quantity: Math.min(Math.max(1, next[index].quantity + safeQuantity), stock)
    };
    return next;
  }

  return [...cart, { productId: product._id, quantity: Math.min(safeQuantity, stock), product }];
}

export function setCartItemQuantity(cart: CartLine[], productId: string, quantity: number): CartLine[] {
  return cart
    .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item))
    .filter((item) => item.quantity > 0);
}

export function removeCartItem(cart: CartLine[], productId: string): CartLine[] {
  return cart.filter((item) => item.productId !== productId);
}

export function readCartFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeCartToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
