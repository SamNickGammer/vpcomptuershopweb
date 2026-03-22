"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import type { CartItem } from "@/hooks/useCart";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
}

export default function CartSidebar({
  isOpen,
  onClose,
  items,
  totalItems,
  totalPrice,
  updateQuantity,
  removeItem,
}: CartSidebarProps) {
  const { user, openAuthModal } = useAuth();
  const router = useRouter();

  function handleCheckout() {
    if (!user) {
      onClose();
      openAuthModal("login");
      return;
    }
    onClose();
    router.push("/checkout");
  }

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-96",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Your Cart</h2>
            {totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d97706] px-1.5 text-xs font-medium text-white">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-500">
              Your cart is empty
            </p>
            <p className="text-center text-sm text-gray-400">
              Browse our products and add something you like!
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-[#d97706] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#b45309]"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex gap-4 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300"
                  >
                    {/* Product Image */}
                    <div className="relative h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-md bg-gray-50">
                      {item.image ? (
                        <ProductImage
                          src={item.image}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="60px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col gap-1">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="line-clamp-1 text-sm font-medium text-gray-900 hover:text-amber-600"
                        onClick={onClose}
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {item.variantName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(item.price)}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(item.compareAtPrice)}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex h-7 w-8 items-center justify-center text-sm font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="flex w-full items-center justify-center rounded-lg bg-[#d97706] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b45309]"
              >
                {user ? "Proceed to Checkout" : "Sign In to Checkout"}
              </button>
              <button
                onClick={onClose}
                className="mt-2 flex w-full items-center justify-center py-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
