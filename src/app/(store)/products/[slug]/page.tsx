"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import {
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Package,
  Check,
  XCircle,
  Home,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type ProductImageEntry = { url: string; altText?: string };
type ProductSpec = { key: string; value: string };

type ProductVariant = {
  variantId: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  images: ProductImageEntry[];
  specs: ProductSpec[];
  stock: number;
  inStock: boolean;
  isDefault?: boolean;
  isActive?: boolean;
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  condition: "new" | "refurbished" | "used";
  sku: string;
  basePrice: number;
  compareAtPrice: number | null;
  images: ProductImageEntry[];
  specs: ProductSpec[];
  stock: number;
  inStock: boolean;
  category: {
    id: string;
    name: string | null;
    slug: string | null;
  } | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
};

// ── Condition config ─────────────────────────────────────────────────────────

const CONDITION_CONFIG: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" }
> = {
  new: { label: "New", variant: "success" },
  refurbished: { label: "Refurbished", variant: "info" },
  used: { label: "Used", variant: "warning" },
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              {i < 3 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Image skeleton */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 w-20 rounded-lg bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className="h-4 w-20 bg-gray-200 rounded-full" />
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-28 bg-gray-200 rounded" />
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="space-y-3 pt-4">
              <div className="h-5 w-16 bg-gray-200 rounded" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-20 bg-gray-200 rounded-lg"
                  />
                ))}
              </div>
            </div>
            <div className="h-12 w-full bg-gray-200 rounded-lg mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 404 ──────────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="rounded-full bg-gray-100 p-4 mx-auto w-fit">
          <Package className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">
          Product Not Found
        </h1>
        <p className="text-gray-500 max-w-md">
          The product you are looking for does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/products">Browse All Products</Link>
        </Button>
      </div>
    </div>
  );
}

// ── Image Gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: ProductImageEntry[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset when images change
  useEffect(() => {
    setSelectedIndex(0);
  }, [images]);

  const mainImage = images[selectedIndex] || null;

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square rounded-xl bg-[#f9fafb] overflow-hidden border border-[#e5e7eb]">
        {mainImage ? (
          <ProductImage
            src={mainImage.url}
            alt={mainImage.altText || "Product image"}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-gray-300" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                idx === selectedIndex
                  ? "border-[#EF9822] ring-1 ring-[#EF9822]/30"
                  : "border-[#e5e7eb] hover:border-gray-400"
              )}
            >
              <ProductImage
                src={img.url}
                alt={img.altText || `Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Selected variant index (null = no variant selected / single product)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  // ── Fetch product ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  // ── Initialize default variant selection when product loads ────────────

  useEffect(() => {
    if (!product) return;

    if (product.variants.length > 0) {
      const defaultVariant =
        product.variants.find((v) => v.isDefault) || product.variants[0];
      setSelectedVariantId(defaultVariant.variantId);
    } else {
      setSelectedVariantId(null);
    }
  }, [product]);

  // ── Find the currently selected variant ────────────────────────────────

  const selectedVariant = useMemo(() => {
    if (!product || product.variants.length === 0) return null;
    if (!selectedVariantId) return null;
    return (
      product.variants.find((v) => v.variantId === selectedVariantId) || null
    );
  }, [product, selectedVariantId]);

  // ── Whether this product has meaningful variant selection ──────────────

  const hasVariantSelection = useMemo(() => {
    if (!product) return false;
    // If no variants or only one default variant, no selection needed
    if (product.variants.length <= 1) return false;
    return true;
  }, [product]);

  // ── Derived: current price, images, specs, stock ──────────────────────

  const currentPrice = useMemo(() => {
    if (selectedVariant) return selectedVariant.price;
    return product?.basePrice ?? 0;
  }, [selectedVariant, product]);

  const currentCompareAtPrice = useMemo(() => {
    if (selectedVariant) return selectedVariant.compareAtPrice;
    return product?.compareAtPrice ?? null;
  }, [selectedVariant, product]);

  const currentImages = useMemo(() => {
    if (selectedVariant && selectedVariant.images.length > 0) {
      return selectedVariant.images;
    }
    return product?.images ?? [];
  }, [selectedVariant, product]);

  const currentSpecs = useMemo(() => {
    if (selectedVariant && selectedVariant.specs.length > 0) {
      return selectedVariant.specs;
    }
    return product?.specs ?? [];
  }, [selectedVariant, product]);

  const currentStock = useMemo(() => {
    if (selectedVariant) return selectedVariant.stock;
    return product?.stock ?? 0;
  }, [selectedVariant, product]);

  const isInStock = currentStock > 0;

  const hasDiscount = useMemo(() => {
    return (
      currentCompareAtPrice !== null && currentCompareAtPrice > currentPrice
    );
  }, [currentPrice, currentCompareAtPrice]);

  const discountPct = useMemo(() => {
    if (!hasDiscount || !currentCompareAtPrice) return 0;
    return Math.round(
      ((currentCompareAtPrice - currentPrice) / currentCompareAtPrice) * 100
    );
  }, [hasDiscount, currentPrice, currentCompareAtPrice]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleVariantSelect = useCallback(
    (variantId: string) => {
      setSelectedVariantId(variantId);
      setQuantity(1);
    },
    []
  );

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    const cartVariantId = selectedVariant
      ? selectedVariant.variantId
      : product.id;
    const cartVariantName = selectedVariant ? selectedVariant.name : "Default";
    const cartImage =
      selectedVariant && selectedVariant.images.length > 0
        ? selectedVariant.images[0].url
        : product.images.length > 0
          ? product.images[0].url
          : null;

    addItem({
      variantId: cartVariantId,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantName: cartVariantName,
      price: currentPrice,
      compareAtPrice: currentCompareAtPrice,
      image: cartImage,
      quantity,
    });

    toast.success("Added to cart!", {
      description: `${product.name}${cartVariantName !== "Default" ? ` - ${cartVariantName}` : ""} x ${quantity}`,
    });
  }, [product, selectedVariant, currentPrice, currentCompareAtPrice, quantity, addItem]);

  // ── Loading / 404 ─────────────────────────────────────────────────────

  if (loading) return <DetailSkeleton />;
  if (notFound || !product) return <NotFound />;

  const conditionCfg = CONDITION_CONFIG[product.condition];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-8 overflow-x-auto">
          <Link
            href="/"
            className="hover:text-[#1a1a1a] transition-colors shrink-0 flex items-center gap-1"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href="/products"
            className="hover:text-[#1a1a1a] transition-colors shrink-0"
          >
            Products
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[#1a1a1a] truncate">{product.name}</span>
        </nav>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Left: Image Gallery */}
          <ImageGallery images={currentImages} />

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Condition badge + Name */}
            <div className="space-y-3">
              {conditionCfg && (
                <Badge variant={conditionCfg.variant}>
                  {conditionCfg.label}
                </Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-[#EF9822]">
                {formatPrice(currentPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(currentCompareAtPrice!)}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    Save {discountPct}%
                  </Badge>
                </>
              )}
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-2">
              {isInStock ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">
                    In Stock
                    {currentStock <= 5 && currentStock > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({currentStock} left)
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">
                    Out of Stock
                  </span>
                </>
              )}
            </div>

            {/* Variant Selector */}
            {hasVariantSelection && (
              <div className="border-t border-[#e5e7eb] pt-6">
                <label className="block text-sm font-medium text-gray-600 mb-3">
                  Options
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected =
                      selectedVariantId === variant.variantId;
                    const isAvailable = variant.stock > 0;

                    return (
                      <button
                        key={variant.variantId}
                        onClick={() =>
                          handleVariantSelect(variant.variantId)
                        }
                        disabled={!isAvailable}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                          isSelected
                            ? "bg-[#EF9822]/10 text-[#EF9822] border-[#EF9822]"
                            : isAvailable
                              ? "bg-white border-[#e5e7eb] text-[#1a1a1a] hover:border-[#EF9822]/50 cursor-pointer"
                              : "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed line-through"
                        )}
                      >
                        {variant.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="border-t border-[#e5e7eb] pt-6 space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2.5">
                  Quantity
                </label>
                <div className="inline-flex items-center border border-[#e5e7eb] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-[#1a1a1a] hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="h-10 w-14 flex items-center justify-center text-sm font-medium border-x border-[#e5e7eb] bg-white text-[#1a1a1a]">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) => Math.min(q + 1, currentStock))
                    }
                    disabled={quantity >= currentStock}
                    className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-[#1a1a1a] hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!isInStock}
                className={cn(
                  "w-full sm:w-auto sm:min-w-[200px] h-12 px-8 rounded-lg text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors",
                  isInStock
                    ? "bg-[#EF9822] text-white hover:bg-[#d98820] cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="h-5 w-5" />
                {isInStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>

            {/* Specifications */}
            {currentSpecs.length > 0 && (
              <div className="border-t border-[#e5e7eb] pt-6">
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">
                  Specifications
                </h2>
                <div className="rounded-xl border border-[#e5e7eb] overflow-hidden">
                  {currentSpecs.map((spec, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "grid grid-cols-2 gap-4 px-4 py-3 text-sm",
                        idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"
                      )}
                    >
                      <span className="font-medium text-gray-500">
                        {spec.key}
                      </span>
                      <span className="text-[#1a1a1a]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t border-[#e5e7eb] pt-6">
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">
                  Description
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
