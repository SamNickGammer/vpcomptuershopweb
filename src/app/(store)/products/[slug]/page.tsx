"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { resolveBulkPricing, type BulkPricingTier } from "@/lib/pricing";
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
  displayName: string;
  label: string;
  description: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  images: ProductImageEntry[];
  specs: ProductSpec[];
  stock: number;
  inStock: boolean;
  bulkPricing?: BulkPricingTier[];
  bulkPricingPreview?: BulkPricingTier | null;
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
  bulkPricing?: BulkPricingTier[];
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
  selectedVariantId: string | null;
  similarProducts?: Array<{
    id: string;
    name: string;
    slug: string;
    condition: string;
    price: number;
    compareAtPrice: number | null;
    image: { url: string; altText?: string } | null;
    inStock: boolean;
    categoryName: string | null;
  }>;
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
        <h1 className="text-2xl font-bold text-gray-900">
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
      <div className="relative aspect-square rounded-xl bg-gray-50 overflow-hidden border border-gray-200">
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
                  ? "border-amber-600 ring-1 ring-amber-600/30"
                  : "border-gray-200 hover:border-gray-400"
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
  const searchParams = useSearchParams();
  const variantParam = searchParams.get("variant");

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
        const url = variantParam
          ? `/api/products/${slug}?variant=${encodeURIComponent(variantParam)}`
          : `/api/products/${slug}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
          // Use the API's selectedVariantId (respects ?variant= param)
          if (data.data.selectedVariantId) {
            setSelectedVariantId(data.data.selectedVariantId);
          }
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
  }, [slug, variantParam]);

  // ── Initialize default variant selection when product loads (fallback) ─

  useEffect(() => {
    if (!product) return;
    // Only set if not already set (API response should have set it)
    if (selectedVariantId) return;

    if (product.variants.length > 0) {
      const defaultVariant =
        product.variants.find((v) => v.isDefault) || product.variants[0];
      setSelectedVariantId(defaultVariant.variantId);
    } else {
      setSelectedVariantId(null);
    }
  }, [product, selectedVariantId]);

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
    if (!product) return 0;
    return resolveBulkPricing({
      basePrice: selectedVariant?.price ?? product.basePrice,
      quantity,
      bulkPricing: selectedVariant?.bulkPricing ?? product.bulkPricing,
    }).unitPrice;
  }, [product, quantity, selectedVariant]);

  const baseUnitPrice = useMemo(() => {
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

  const currentBulkPricing = useMemo(
    () => selectedVariant?.bulkPricing ?? product?.bulkPricing ?? [],
    [product, selectedVariant]
  );

  const currentBulkMatch = useMemo(
    () =>
      resolveBulkPricing({
        basePrice: baseUnitPrice,
        quantity,
        bulkPricing: currentBulkPricing,
      }).matchedTier,
    [baseUnitPrice, currentBulkPricing, quantity]
  );

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
    const cartVariantName = selectedVariant ? (selectedVariant.displayName || selectedVariant.name) : "Default";
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
      basePrice: baseUnitPrice,
      price: currentPrice,
      compareAtPrice: currentCompareAtPrice,
      image: cartImage,
      quantity,
      bulkPricing: currentBulkPricing,
    });

    toast.success("Added to cart!", {
      description: `${product.name}${cartVariantName !== "Default" ? ` - ${cartVariantName}` : ""} x ${quantity}`,
    });
  }, [product, selectedVariant, baseUnitPrice, currentPrice, currentCompareAtPrice, quantity, addItem, currentBulkPricing]);

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
            className="hover:text-gray-900 transition-colors shrink-0 flex items-center gap-1"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href="/products"
            className="hover:text-gray-900 transition-colors shrink-0"
          >
            Products
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-gray-900 truncate">{selectedVariant?.displayName || product.name}</span>
        </nav>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Left: Image Gallery + Similar Products */}
          <div className="space-y-6">
            <ImageGallery images={currentImages} />

            {/* Similar Products — below images */}
            {product.similarProducts && product.similarProducts.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Similar Products</h3>
                <div className="grid grid-cols-3 gap-2">
                  {product.similarProducts.slice(0, 6).map((sp) => {
                    const spDiscount = sp.compareAtPrice && sp.compareAtPrice > sp.price
                      ? Math.round(((sp.compareAtPrice - sp.price) / sp.compareAtPrice) * 100)
                      : null;
                    return (
                      <Link key={sp.id} href={`/products/${sp.slug}`} className="group">
                        <div className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm hover:border-gray-300 transition-all bg-white">
                          <div className="aspect-square bg-gray-50 relative overflow-hidden">
                            {sp.image ? (
                              <ProductImage
                                src={sp.image.url}
                                alt={sp.image.altText || sp.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="150px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-300" />
                              </div>
                            )}
                            {spDiscount && (
                              <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                                -{spDiscount}%
                              </span>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[10px] font-medium text-gray-700 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug min-h-[28px]">
                              {sp.name}
                            </p>
                            <p className="text-xs font-bold text-gray-900 mt-1">{formatPrice(sp.price)}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Condition badge + Name */}
            <div className="space-y-3">
              {conditionCfg && (
                <Badge variant={conditionCfg.variant}>
                  {conditionCfg.label}
                </Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                {selectedVariant?.displayName || product.name}
              </h1>
              {selectedVariant?.label && (
                <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                  {selectedVariant.label}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-gray-900">
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

            {currentBulkPricing.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Bulk Pricing Available
                    </h2>
                    <p className="text-xs text-gray-600 mt-1">
                      Price updates automatically when you increase quantity.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Current unit price</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(currentPrice)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {currentBulkPricing
                    .slice()
                    .sort((a, b) => a.minQuantity - b.minQuantity)
                    .map((tier) => {
                      const isActive = currentBulkMatch?.minQuantity === tier.minQuantity;
                      return (
                        <div
                          key={`${tier.minQuantity}-${tier.unitPrice}`}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                            isActive
                              ? "border-amber-500 bg-white"
                              : "border-amber-200/70 bg-white/70"
                          )}
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              Buy {tier.minQuantity}+ pcs
                            </p>
                            <p className="text-xs text-gray-500">
                              {tier.label || "Special per-piece price"}
                              {tier.freeShipping ? " + free shipping" : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {formatPrice(tier.unitPrice)}
                            </p>
                            <p className="text-[11px] text-emerald-600">
                              Save {formatPrice(Math.max(0, baseUnitPrice - tier.unitPrice))}/pc
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Variant Selector */}
            {hasVariantSelection && (
              <div className="border-t border-gray-200 pt-6">
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
                            ? "bg-amber-50 text-amber-600 border-amber-600"
                            : isAvailable
                              ? "bg-white border-gray-200 text-gray-900 hover:border-amber-600/50 cursor-pointer"
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
            <div className="border-t border-gray-200 pt-6 space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2.5">
                  Quantity
                </label>
                <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="h-10 w-14 flex items-center justify-center text-sm font-medium border-x border-gray-200 bg-white text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) => Math.min(q + 1, currentStock))
                    }
                    disabled={quantity >= currentStock}
                    className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Unit price: <span className="font-semibold text-gray-900">{formatPrice(currentPrice)}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  Line total: <span className="font-semibold text-gray-900">{formatPrice(currentPrice * quantity)}</span>
                  {currentBulkMatch?.freeShipping && (
                    <>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="font-medium text-emerald-600">Free shipping unlocked</span>
                    </>
                  )}
                </p>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!isInStock}
                className={cn(
                  "w-full sm:w-auto sm:min-w-[200px] h-12 px-8 rounded-lg text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors",
                  isInStock
                    ? "bg-[#d97706] text-white hover:bg-[#b45309] cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="h-5 w-5" />
                {isInStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>

            {/* Specifications */}
            {currentSpecs.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Specifications
                </h2>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {currentSpecs.map((spec, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "grid grid-cols-2 gap-4 px-4 py-3 text-sm",
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <span className="font-medium text-gray-500">
                        {spec.key}
                      </span>
                      <span className="text-gray-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {(selectedVariant?.description || product.description) && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Description
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                  {selectedVariant?.description || product.description}
                </div>
              </div>
            )}

            {/* Other Variants */}
            {product.variants.length > 1 && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Other Variants
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.variants
                    .filter((v) => v.variantId !== selectedVariantId)
                    .map((v) => (
                      <Link
                        key={v.variantId}
                        href={`/products/${product.slug}?variant=${v.variantId}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-amber-600/40 hover:shadow-sm transition-all"
                      >
                        {v.images.length > 0 ? (
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                            <ProductImage
                              src={v.images[0].url}
                              alt={v.images[0].altText || v.displayName}
                              width={56}
                              height={56}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : product.images.length > 0 ? (
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                            <ProductImage
                              src={product.images[0].url}
                              alt={product.images[0].altText || v.displayName}
                              width={56}
                              height={56}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {v.displayName || `${product.name} ${v.name}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-gray-900">
                              {formatPrice(v.price)}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                v.stock > 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              )}
                            >
                              {v.stock > 0 ? "In Stock" : "Out of Stock"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
