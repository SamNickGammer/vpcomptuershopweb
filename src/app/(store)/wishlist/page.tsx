"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist, WishlistItem } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { cn, formatPrice } from "@/lib/utils/helpers";
import {
  Heart,
  ShoppingCart,
  Trash2,
  Loader2,
  Package,
  LogIn,
} from "lucide-react";

function WishlistCard({ item }: { item: WishlistItem }) {
  const { removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  const product = item.product;

  // If there's a variantId, find the variant data
  const variant =
    item.variantId && product.variants
      ? product.variants.find((v) => v.variantId === item.variantId)
      : null;

  const name = variant ? variant.displayName : product.name;
  const price = variant ? variant.price : product.basePrice;
  const compareAtPrice = variant
    ? variant.compareAtPrice ?? null
    : product.compareAtPrice;
  const stock = variant ? variant.stock : product.stock;
  const inStock = stock > 0;
  const image =
    variant && variant.images.length > 0
      ? variant.images[0]
      : product.images.length > 0
        ? product.images[0]
        : null;

  const productLink = item.variantId
    ? `/products/${product.slug}?variant=${item.variantId}`
    : `/products/${product.slug}`;

  const discount =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  function handleAddToCart() {
    if (!inStock) return;
    addItem({
      variantId: item.variantId || item.productId,
      productId: item.productId,
      productName: name,
      productSlug: product.slug,
      variantName: variant?.name || "Default",
      price,
      compareAtPrice,
      image: image?.url ?? null,
      quantity: 1,
    });
  }

  function handleRemove() {
    removeFromWishlist(item.productId, item.variantId);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300 flex flex-col">
      {/* Image */}
      <Link href={productLink} className="block">
        <div className="relative aspect-square bg-gray-50 overflow-hidden group">
          {image ? (
            <>
              <ProductImage
                src={image.url}
                alt={image.altText || name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10 pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
          )}

          {/* Condition badge */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm",
                product.condition === "new"
                  ? "bg-green-500 text-white"
                  : product.condition === "refurbished"
                    ? "bg-amber-500 text-white"
                    : "bg-gray-500 text-white",
              )}
            >
              {product.condition}
            </span>
            {discount && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                -{discount}%
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3.5">
        <Link href={productLink}>
          <h3 className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-snug mb-2 hover:text-[#c47e18] transition-colors min-h-[36px]">
            {name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-3 mt-auto">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(price)}
          </span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>

        {/* Stock */}
        <div className="flex items-center gap-1 mb-3">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              inStock ? "bg-green-500" : "bg-red-400",
            )}
          />
          <span
            className={cn(
              "text-[11px] font-medium",
              inStock ? "text-green-600" : "text-red-500",
            )}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {inStock ? (
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium py-2.5 rounded-lg transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          ) : (
            <Link
              href={productLink}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-400 font-medium py-2.5 rounded-lg border border-gray-200 bg-gray-50"
            >
              View Details
            </Link>
          )}
          <button
            onClick={handleRemove}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            aria-label="Remove from wishlist"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const { items, loading: wishlistLoading } = useWishlist();

  // Loading state
  if (authLoading || wishlistLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <Heart className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Sign in to view your wishlist
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
          Save your favorite products and come back to them anytime.
        </p>
        <button
          onClick={() => openAuthModal("login")}
          className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </button>
      </div>
    );
  }

  // Empty wishlist
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <Heart className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Your wishlist is empty
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
          Browse our products and add your favorites to the wishlist.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Wishlist
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
