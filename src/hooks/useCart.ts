"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";
import type { BulkPricingTier } from "@/lib/pricing";
import { resolveBulkPricing } from "@/lib/pricing";

export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  basePrice: number; // paise
  price: number; // paise
  compareAtPrice: number | null;
  image: string | null;
  quantity: number;
  bulkPricing: BulkPricingTier[];
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "vp_cart";

function getStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        ...item,
        basePrice: item.basePrice ?? item.price ?? 0,
        bulkPricing: Array.isArray(item.bulkPricing) ? item.bulkPricing : [],
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function persistCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => getStoredCart());

  useEffect(() => {
    persistCart(items);
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          const nextQuantity = existing.quantity + (item.quantity ?? 1);
          const nextPrice = resolveBulkPricing({
            basePrice: existing.basePrice,
            quantity: nextQuantity,
            bulkPricing: existing.bulkPricing,
          }).unitPrice;
          return prev.map((i) =>
            i.variantId === item.variantId
              ? { ...i, quantity: nextQuantity, price: nextPrice }
              : i
          );
        }
        const quantity = item.quantity ?? 1;
        const bulkPricing = item.bulkPricing || [];
        const basePrice = item.basePrice ?? item.price;
        const price = resolveBulkPricing({
          basePrice,
          quantity,
          bulkPricing,
        }).unitPrice;
        return [
          ...prev,
          {
            ...item,
            basePrice,
            bulkPricing,
            quantity,
            price,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.variantId !== variantId));
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.variantId === variantId
            ? {
                ...i,
                quantity,
                price: resolveBulkPricing({
                  basePrice: i.basePrice,
                  quantity,
                  bulkPricing: i.bulkPricing,
                }).unitPrice,
              }
            : i
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return React.createElement(
    CartContext.Provider,
    {
      value: {
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      },
    },
    children
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
