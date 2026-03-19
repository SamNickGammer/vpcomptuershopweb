"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Package,
  Check,
  XCircle,
  Loader2,
  Home,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { Toaster, toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type VariantImage = { url: string; altText?: string };
type VariantSpec = { key: string; value: string };

type OptionValue = {
  id: string;
  value: string;
  position: number;
};

type ProductOption = {
  id: string;
  name: string;
  position: number;
  values: OptionValue[];
};

type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  images: VariantImage[];
  specs: VariantSpec[];
  stock: number;
  inStock: boolean;
  isDefault: boolean;
  selectedOptions: string[]; // option value IDs
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  condition: "new" | "refurbished" | "used";
  category: {
    id: string;
    name: string | null;
    slug: string | null;
  } | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  options: ProductOption[];
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Image skeleton */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl bg-muted animate-pulse" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 w-20 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded-full" />
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-28 bg-muted rounded" />
              <div className="h-6 w-20 bg-muted rounded" />
            </div>
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="space-y-3 pt-4">
              <div className="h-5 w-16 bg-muted rounded" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-20 bg-muted rounded-lg"
                  />
                ))}
              </div>
            </div>
            <div className="h-12 w-full bg-muted rounded-lg mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 404 ──────────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="rounded-full bg-muted p-4 mx-auto w-fit">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Product Not Found
        </h1>
        <p className="text-muted-foreground max-w-md">
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

function ImageGallery({ images }: { images: VariantImage[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset when images change
  useEffect(() => {
    setSelectedIndex(0);
  }, [images]);

  const mainImage = images[selectedIndex] || null;

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square rounded-xl bg-muted/50 overflow-hidden border border-border">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={mainImage.altText || "Product image"}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                idx === selectedIndex
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <Image
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

// ── Variant Selector ─────────────────────────────────────────────────────────

function VariantSelector({
  options,
  variants,
  selectedOptionValues,
  onSelect,
}: {
  options: ProductOption[];
  variants: ProductVariant[];
  selectedOptionValues: Map<string, string>; // optionId → optionValueId
  onSelect: (optionId: string, valueId: string) => void;
}) {
  // Build a lookup: optionValueId → optionId for quick access
  const valueToOptionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of options) {
      for (const val of opt.values) {
        map.set(val.id, opt.id);
      }
    }
    return map;
  }, [options]);

  // For each option value, determine if selecting it would lead to at least
  // one valid variant combination (given the other selected options)
  const getAvailableValues = useCallback(
    (currentOptionId: string): Set<string> => {
      const available = new Set<string>();

      // Get all selected values EXCEPT the current option
      const otherSelections: string[] = [];
      for (const [optId, valId] of selectedOptionValues.entries()) {
        if (optId !== currentOptionId) {
          otherSelections.push(valId);
        }
      }

      // For each variant, check if it matches all other selections
      for (const variant of variants) {
        const variantValueIds = new Set(variant.selectedOptions);

        // Check if variant matches all other selected values
        const matchesOthers = otherSelections.every((selVal) =>
          variantValueIds.has(selVal)
        );

        if (matchesOthers) {
          // This variant is compatible — find which value it uses for the current option
          for (const valId of variant.selectedOptions) {
            const optId = valueToOptionMap.get(valId);
            if (optId === currentOptionId) {
              available.add(valId);
            }
          }
        }
      }

      return available;
    },
    [variants, selectedOptionValues, valueToOptionMap]
  );

  return (
    <div className="space-y-5">
      {options.map((option) => {
        const availableValues = getAvailableValues(option.id);
        const selectedValueId = selectedOptionValues.get(option.id);

        return (
          <div key={option.id}>
            <label className="block text-sm font-medium text-muted-foreground mb-2.5">
              {option.name}
              {selectedValueId && (
                <span className="text-foreground ml-2">
                  :{" "}
                  {option.values.find((v) => v.id === selectedValueId)
                    ?.value || ""}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {option.values.map((val) => {
                const isSelected = selectedValueId === val.id;
                const isAvailable = availableValues.has(val.id);

                return (
                  <button
                    key={val.id}
                    onClick={() => isAvailable && onSelect(option.id, val.id)}
                    disabled={!isAvailable}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary ring-1 ring-primary/30"
                        : isAvailable
                          ? "bg-card border-border text-foreground hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
                          : "bg-muted/30 border-border/50 text-muted-foreground/40 cursor-not-allowed line-through"
                    )}
                  >
                    {val.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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

  // Variant selection state
  const [selectedOptionValues, setSelectedOptionValues] = useState<
    Map<string, string>
  >(new Map());
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

  // ── Initialize default selections when product loads ───────────────────

  useEffect(() => {
    if (!product) return;

    // Find the default variant (or first one)
    const defaultVariant =
      product.variants.find((v) => v.isDefault) || product.variants[0];

    if (defaultVariant && product.options.length > 0) {
      // Build selection map from the default variant's option values
      const initial = new Map<string, string>();
      for (const valId of defaultVariant.selectedOptions) {
        // Find which option this value belongs to
        for (const opt of product.options) {
          const foundVal = opt.values.find((v) => v.id === valId);
          if (foundVal) {
            initial.set(opt.id, valId);
            break;
          }
        }
      }
      setSelectedOptionValues(initial);
    }
  }, [product]);

  // ── Find the currently selected variant ────────────────────────────────

  const selectedVariant = useMemo(() => {
    if (!product) return null;

    // If no options, return default variant
    if (product.options.length === 0) {
      return (
        product.variants.find((v) => v.isDefault) || product.variants[0] || null
      );
    }

    // Find variant that matches all selected option values
    const selectedValueIds = new Set(selectedOptionValues.values());

    return (
      product.variants.find((variant) => {
        if (variant.selectedOptions.length !== selectedValueIds.size)
          return false;
        return variant.selectedOptions.every((valId) =>
          selectedValueIds.has(valId)
        );
      }) || null
    );
  }, [product, selectedOptionValues]);

  // ── Derived data ───────────────────────────────────────────────────────

  const images = useMemo(() => {
    if (selectedVariant && selectedVariant.images.length > 0) {
      return selectedVariant.images;
    }
    // Fallback: collect all images from all variants
    if (product) {
      const all: VariantImage[] = [];
      for (const v of product.variants) {
        for (const img of v.images) {
          if (!all.find((i) => i.url === img.url)) {
            all.push(img);
          }
        }
      }
      return all;
    }
    return [];
  }, [selectedVariant, product]);

  const specs = useMemo(() => {
    if (selectedVariant) return selectedVariant.specs;
    if (product && product.variants.length > 0) return product.variants[0].specs;
    return [];
  }, [selectedVariant, product]);

  const hasDiscount = useMemo(() => {
    if (!selectedVariant) return false;
    return (
      selectedVariant.compareAtPrice !== null &&
      selectedVariant.compareAtPrice > selectedVariant.price
    );
  }, [selectedVariant]);

  const discountPct = useMemo(() => {
    if (!hasDiscount || !selectedVariant?.compareAtPrice) return 0;
    return Math.round(
      ((selectedVariant.compareAtPrice - selectedVariant.price) /
        selectedVariant.compareAtPrice) *
        100
    );
  }, [hasDiscount, selectedVariant]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleOptionSelect = useCallback(
    (optionId: string, valueId: string) => {
      setSelectedOptionValues((prev) => {
        const next = new Map(prev);
        next.set(optionId, valueId);
        return next;
      });
    },
    []
  );

  const handleAddToCart = useCallback(() => {
    if (!product || !selectedVariant) return;

    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      compareAtPrice: selectedVariant.compareAtPrice,
      image: selectedVariant.images[0]?.url || null,
      quantity,
    });

    toast.success("Added to cart!", {
      description: `${product.name}${selectedVariant.name !== "Default" ? ` - ${selectedVariant.name}` : ""} x ${quantity}`,
    });
  }, [product, selectedVariant, quantity, addItem]);

  // ── Loading / 404 ─────────────────────────────────────────────────────

  if (loading) return <DetailSkeleton />;
  if (notFound || !product) return <NotFound />;

  const conditionCfg = CONDITION_CONFIG[product.condition];
  const isOutOfStock = selectedVariant ? !selectedVariant.inStock : true;

  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8 overflow-x-auto">
            <Link
              href="/"
              className="hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link
              href="/products"
              className="hover:text-foreground transition-colors shrink-0"
            >
              Products
            </Link>
            {product.category && product.category.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <Link
                  href={`/products?categoryId=${product.category.id}`}
                  className="hover:text-foreground transition-colors shrink-0"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground truncate">{product.name}</span>
          </nav>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
            {/* Left: Image Gallery */}
            <ImageGallery images={images} />

            {/* Right: Product Info */}
            <div className="space-y-6">
              {/* Name + condition */}
              <div className="space-y-3">
                <Badge variant={conditionCfg.variant}>
                  {conditionCfg.label}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 flex-wrap">
                {selectedVariant ? (
                  <>
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(selectedVariant.price)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          {formatPrice(selectedVariant.compareAtPrice!)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          Save {discountPct}%
                        </Badge>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-lg text-muted-foreground">
                    Select options to see price
                  </span>
                )}
              </div>

              {/* Stock indicator */}
              {selectedVariant && (
                <div className="flex items-center gap-2">
                  {selectedVariant.inStock ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-400">
                        In Stock
                        {selectedVariant.stock <= 5 && selectedVariant.stock > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({selectedVariant.stock} left)
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-400">
                        Out of Stock
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Variant Selector */}
              {product.options.length > 0 && (
                <div className="border-t border-border pt-6">
                  <VariantSelector
                    options={product.options}
                    variants={product.variants}
                    selectedOptionValues={selectedOptionValues}
                    onSelect={handleOptionSelect}
                  />
                </div>
              )}

              {/* Quantity + Add to Cart */}
              <div className="border-t border-border pt-6 space-y-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2.5">
                    Quantity
                  </label>
                  <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                      disabled={quantity <= 1}
                      className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="h-10 w-14 flex items-center justify-center text-sm font-medium border-x border-border bg-background">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity((q) =>
                          selectedVariant
                            ? Math.min(q + 1, selectedVariant.stock)
                            : q
                        )
                      }
                      disabled={
                        !selectedVariant ||
                        quantity >= (selectedVariant?.stock ?? 0)
                      }
                      className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || !selectedVariant}
                  className="w-full sm:w-auto sm:min-w-[200px] h-12 text-base font-semibold gap-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                </Button>
              </div>

              {/* Specifications */}
              {specs.length > 0 && (
                <div className="border-t border-border pt-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Specifications
                  </h2>
                  <div className="rounded-xl border border-border overflow-hidden">
                    {specs.map((spec, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "grid grid-cols-2 gap-4 px-4 py-3 text-sm",
                          idx % 2 === 0
                            ? "bg-card"
                            : "bg-muted/30"
                        )}
                      >
                        <span className="font-medium text-muted-foreground">
                          {spec.key}
                        </span>
                        <span className="text-foreground">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="border-t border-border pt-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Description
                  </h2>
                  <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
