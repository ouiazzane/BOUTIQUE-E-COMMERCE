import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import api from '../services/api';
import { readCartFromStorage, upsertCartItem, writeCartToStorage } from '../services/cart';
import type { CartItem, Product, UserProfile } from '../types';

type AppContextValue = {
  cart: CartItem[];
  cartLoading: boolean;
  cartError: string;
  user: UserProfile | null;
  authLoading: boolean;
  addToCart: (product: Product, quantity?: number) => boolean;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => Promise<void>;
  login: (token: string, profile: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);
const GUEST_CART_KEY = 'guest_cart';
const GUEST_CART_MERGE_ID_KEY = 'guest_cart_merge_id';
const LEGACY_CART_KEY = 'cart';

function getGuestCartMergeId(): string {
  const existingId = localStorage.getItem(GUEST_CART_MERGE_ID_KEY);
  if (existingId) return existingId;

  const mergeId = crypto.randomUUID();
  localStorage.setItem(GUEST_CART_MERGE_ID_KEY, mergeId);
  return mergeId;
}

function getInitialCart(): CartItem[] {
  return readCartFromStorage<CartItem[]>(
    GUEST_CART_KEY,
    readCartFromStorage<CartItem[]>(LEGACY_CART_KEY, [])
  );
}

function cartPayload(cart: CartItem[]) {
  return cart.map(({ productId, quantity }) => ({ productId, quantity }));
}

function cartResponse(response: { data: { data: { items: CartItem[] } } }): CartItem[] {
  return response.data.data.items;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(getInitialCart);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const cartRef = useRef(cart);
  const userRef = useRef<UserProfile | null>(null);
  const cartQueue = useRef<Promise<void>>(Promise.resolve());
  const cartRequestId = useRef(0);

  const applyCart = useCallback((next: CartItem[]) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  const applyUser = useCallback((next: UserProfile | null) => {
    userRef.current = next;
    setUser(next);
  }, []);

  const synchronizeCart = useCallback((next: CartItem[]) => {
    applyCart(next);
    const userAtRequest = userRef.current;
    if (!userAtRequest) {
      writeCartToStorage(GUEST_CART_KEY, next);
      localStorage.setItem(GUEST_CART_MERGE_ID_KEY, crypto.randomUUID());
      return;
    }

    const requestId = ++cartRequestId.current;
    cartQueue.current = cartQueue.current
      .then(async () => {
        const response = await api.put('/cart', { items: cartPayload(next) });
        if (requestId === cartRequestId.current && userRef.current?.id === userAtRequest.id) {
          applyCart(cartResponse(response));
          setCartError('');
        }
      })
      .catch(async () => {
        if (requestId !== cartRequestId.current || userRef.current?.id !== userAtRequest.id) return;
        setCartError('Your cart could not be synchronized. Please retry your change.');
        try {
          const response = await api.get('/cart');
          if (requestId === cartRequestId.current && userRef.current?.id === userAtRequest.id) {
            applyCart(cartResponse(response));
          }
        } catch {
          setCartError('Your cart could not be loaded from the server.');
        }
      });
  }, [applyCart]);

  const loadAndMergeCart = useCallback(async (guestCart: CartItem[]) => {
    setCartLoading(true);
    setCartError('');
    try {
      const response = await api.post('/cart/merge', {
        items: cartPayload(guestCart),
        mergeId: getGuestCartMergeId()
      });
      const merged = cartResponse(response);
      applyCart(merged);
      localStorage.removeItem(GUEST_CART_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
      localStorage.removeItem(GUEST_CART_MERGE_ID_KEY);
    } catch (error) {
      applyCart(guestCart);
      setCartError('Your account cart could not be synchronized. Please retry after reconnecting.');
      throw error;
    } finally {
      setCartLoading(false);
    }
  }, [applyCart]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    const guestCart = getInitialCart();
    api.get('/auth/me')
      .then(async (response) => {
        applyUser(response.data.data as UserProfile);
        try {
          await loadAndMergeCart(guestCart);
        } catch {
          return;
        }
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        applyUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [applyUser, loadAndMergeCart]);

  useEffect(() => {
    if (!user) {
      writeCartToStorage(GUEST_CART_KEY, cart);
    }
  }, [cart, user]);

  const addToCart = (product: Product, quantity = 1) => {
    if (authLoading || cartLoading || !Number.isInteger(quantity) || quantity < 1) return false;
    const currentQuantity = cartRef.current.find((item) => item.productId === product._id)?.quantity ?? 0;
    if (currentQuantity + quantity > product.stock) {
      setCartError('The requested quantity exceeds available stock.');
      return false;
    }
    const next = upsertCartItem(cartRef.current, product, quantity);
    if (next.find((item) => item.productId === product._id)?.quantity === cartRef.current.find((item) => item.productId === product._id)?.quantity) {
      setCartError('This quantity is not available in stock.');
      return false;
    }
    setCartError('');
    synchronizeCart(next);
    return true;
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    const item = cartRef.current.find((entry) => entry.productId === productId);
    if (!item) return;
    if (quantity > item.product.stock) {
      setCartError('The requested quantity exceeds available stock.');
      return;
    }
    const nextQuantity = Math.min(Math.max(1, quantity), item.product.stock);
    setCartError('');
    const next = cartRef.current.map((entry) =>
      entry.productId === productId ? { ...entry, quantity: nextQuantity } : entry
    );
    synchronizeCart(next);
  };

  const removeFromCart = (productId: string) => {
    synchronizeCart(cartRef.current.filter((item) => item.productId !== productId));
  };

  const clearCart = async () => {
    applyCart([]);
    if (!userRef.current) localStorage.setItem(GUEST_CART_MERGE_ID_KEY, crypto.randomUUID());
    setCartError('');
  };

  const login = async (token: string, profile: UserProfile) => {
    const guestCart = cartRef.current;
    setAuthLoading(true);
    localStorage.setItem('auth_token', token);
    applyUser(profile);
    try {
      await loadAndMergeCart(guestCart);
    } catch {
      return;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_token');
    applyUser(null);
    applyCart([]);
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(LEGACY_CART_KEY);
    localStorage.removeItem(GUEST_CART_MERGE_ID_KEY);
    setCartError('');
    setAuthLoading(false);
    await api.post('/auth/logout').catch(() => undefined);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      applyUser(null);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    try {
      const response = await api.get('/auth/me');
      const profile = response.data.data as UserProfile;
      applyUser(profile);
      try {
        await loadAndMergeCart(getInitialCart());
      } catch {
        return;
      }
    } catch {
      localStorage.removeItem('auth_token');
      applyUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const value = useMemo<AppContextValue>(
    () => ({ cart, cartLoading, cartError, user, authLoading, addToCart, updateCartQuantity, removeFromCart, clearCart, login, logout, refreshProfile }),
    [cart, cartLoading, cartError, user, authLoading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return context;
}
