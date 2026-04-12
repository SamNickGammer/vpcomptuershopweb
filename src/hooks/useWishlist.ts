"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./useAuth";
import type { BulkPricingTier } from "@/lib/pricing";

export type WishlistItem = {
  id: string;
  productId: string;
  variantId: string | null;
  product: {
    name: string;
    slug: string;
    images: Array<{ url: string; altText?: string }>;
    basePrice: number;
    compareAtPrice: number | null;
    bulkPricing?: BulkPricingTier[];
    stock: number;
    condition: string;
    variants?: Array<{
      variantId: string;
      name: string;
      displayName: string;
      price: number;
      compareAtPrice?: number | null;
      bulkPricing?: BulkPricingTier[];
      images: Array<{ url: string; altText?: string }>;
      stock: number;
    }>;
  };
};

type WishlistContextType = {
  items: WishlistItem[];
  loading: boolean;
  isWishlisted: (productId: string, variantId?: string | null) => boolean;
  toggleWishlist: (
    productId: string,
    variantId?: string | null,
  ) => Promise<void>;
  removeFromWishlist: (
    productId: string,
    variantId?: string | null,
  ) => Promise<void>;
  totalItems: number;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, openAuthModal } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch wishlist when user changes
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isWishlisted = useCallback(
    (productId: string, variantId?: string | null) => {
      return items.some(
        (item) =>
          item.productId === productId &&
          (variantId
            ? item.variantId === variantId
            : item.variantId === null),
      );
    },
    [items],
  );

  const toggleWishlist = useCallback(
    async (productId: string, variantId?: string | null) => {
      if (!user) {
        openAuthModal("login");
        return;
      }

      const alreadyWishlisted = isWishlisted(productId, variantId);

      if (alreadyWishlisted) {
        // Optimistic removal
        setItems((prev) =>
          prev.filter(
            (item) =>
              !(
                item.productId === productId &&
                (variantId
                  ? item.variantId === variantId
                  : item.variantId === null)
              ),
          ),
        );

        try {
          await fetch("/api/wishlist", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ productId, variantId: variantId ?? null }),
          });
        } catch {
          // Revert on error
          await fetchWishlist();
        }
      } else {
        try {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ productId, variantId: variantId ?? null }),
          });
          const data = await res.json();
          if (data.success) {
            // Refetch to get full product data
            await fetchWishlist();
          }
        } catch {
          // silent
        }
      }
    },
    [user, openAuthModal, isWishlisted, fetchWishlist],
  );

  const removeFromWishlist = useCallback(
    async (productId: string, variantId?: string | null) => {
      // Optimistic removal
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.productId === productId &&
              (variantId
                ? item.variantId === variantId
                : item.variantId === null)
            ),
        ),
      );

      try {
        await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId, variantId: variantId ?? null }),
        });
      } catch {
        await fetchWishlist();
      }
    },
    [fetchWishlist],
  );

  const value: WishlistContextType = {
    items,
    loading,
    isWishlisted,
    toggleWishlist,
    removeFromWishlist,
    totalItems: items.length,
  };

  return React.createElement(WishlistContext.Provider, { value }, children);
}

export function useWishlist(): WishlistContextType {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return ctx;
}
