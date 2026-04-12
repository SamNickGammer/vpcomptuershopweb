"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  ShoppingCart,
  Heart,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { cn, formatPrice } from "@/lib/utils/helpers";
import type { BulkPricingTier } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type ProductListItem = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  description: string | null;
  condition: "new" | "refurbished" | "used";
  categoryName: string | null;
  price: number;
  compareAtPrice: number | null;
  image: { url: string; altText?: string } | null;
  stock: number;
  inStock: boolean;
  label: string | null;
  isFeatured: boolean;
  bulkPricing?: BulkPricingTier[] | null;
  bulkPricingPreview?: BulkPricingTier | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ── Condition helpers ────────────────────────────────────────────────────────

const CONDITION_CONFIG: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" }
> = {
  new: { label: "New", variant: "success" },
  refurbished: { label: "Refurbished", variant: "info" },
  used: { label: "Used", variant: "warning" },
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

// ── Skeleton Components ──────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 bg-muted rounded-full" />
        <div className="h-5 w-3/4 bg-muted rounded" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-muted rounded" />
          <div className="h-4 w-14 bg-muted rounded" />
        </div>
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-24 bg-muted rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: ProductListItem }) {
  const conditionCfg = CONDITION_CONFIG[product.condition];
  const hasDiscount =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) *
          100
      )
    : 0;
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.productId, product.variantId);

  const productLink = product.variantId
    ? `/products/${product.slug}?variant=${product.variantId}`
    : `/products/${product.slug}`;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addItem({
      variantId: product.variantId || product.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantName: product.label || "Default",
      basePrice: product.price,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.image?.url ?? null,
      quantity: 1,
      bulkPricing: product.bulkPricing || [],
    });
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.productId, product.variantId);
  }

  return (
    <Link
      href={productLink}
      className="group rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-300 flex flex-col"
    >
      {/* Image with overlay */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.image?.url ? (
          <>
            <ProductImage
              src={product.image.url}
              alt={product.image.altText || product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Gradient overlay for badge visibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10 pointer-events-none" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
          <span className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm",
            conditionCfg.variant === "success" ? "bg-green-500 text-white" :
            conditionCfg.variant === "warning" ? "bg-amber-500 text-white" :
            "bg-gray-500 text-white"
          )}>
            {conditionCfg.label}
          </span>
          {hasDiscount && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              -{discountPct}%
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className="absolute bottom-2.5 right-2.5 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              wishlisted ? "fill-red-500 text-red-500" : "text-gray-500 hover:text-red-400"
            )}
          />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3.5">
        {product.categoryName && (
          <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">
            {product.categoryName}
          </span>
        )}

        <h3 className="text-[13px] font-medium leading-snug line-clamp-2 text-gray-800 group-hover:text-gray-900 transition-colors min-h-[36px] mb-2">
          {product.name}
        </h3>

        {/* Price + Stock + Cart Icon */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", product.inStock ? "bg-green-500" : "bg-red-400")} />
              <span className={cn("text-[10px] font-medium", product.inStock ? "text-green-600" : "text-red-500")}>
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            {product.bulkPricingPreview && (
              <div className="mt-1 text-[10px] font-medium text-amber-700">
                Bulk from {product.bulkPricingPreview.minQuantity}+ pcs
              </div>
            )}
          </div>
          {product.inStock && (
            <button
              onClick={handleAddToCart}
              className="p-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
              title="Add to Cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Filter Sidebar Content ───────────────────────────────────────────────────

function FilterContent({
  categories,
  selectedCategories,
  selectedConditions,
  minPrice,
  maxPrice,
  onCategoryToggle,
  onConditionToggle,
  onMinPriceChange,
  onMaxPriceChange,
  onClear,
  loading,
}: {
  categories: CategoryItem[];
  selectedCategories: Set<string>;
  selectedConditions: Set<string>;
  minPrice: string;
  maxPrice: string;
  onCategoryToggle: (id: string) => void;
  onConditionToggle: (c: string) => void;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onClear: () => void;
  loading: boolean;
}) {
  const hasFilters =
    selectedCategories.size > 0 ||
    selectedConditions.size > 0 ||
    minPrice !== "" ||
    maxPrice !== "";

  // Only show top-level categories and their children
  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Categories
        </h3>
        {loading ? (
          <FiltersSkeleton />
        ) : (
          <div className="space-y-1">
            {topLevel.map((cat) => {
              const children = categories.filter(
                (c) => c.parentId === cat.id
              );
              return (
                <div key={cat.id}>
                  <label className="flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(cat.id)}
                      onChange={() => onCategoryToggle(cat.id)}
                      className="h-4 w-4 rounded border-border bg-background text-primary accent-primary"
                    />
                    <span className="text-sm text-foreground">{cat.name}</span>
                  </label>
                  {children.length > 0 && (
                    <div className="ml-6 space-y-0.5">
                      {children.map((child) => (
                        <label
                          key={child.id}
                          className="flex items-center gap-2.5 py-1 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(child.id)}
                            onChange={() => onCategoryToggle(child.id)}
                            className="h-3.5 w-3.5 rounded border-border bg-background text-primary accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">
                            {child.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Condition */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Condition
        </h3>
        <div className="space-y-1">
          {(["new", "refurbished", "used"] as const).map((cond) => (
            <label
              key={cond}
              className="flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedConditions.has(cond)}
                onChange={() => onConditionToggle(cond)}
                className="h-4 w-4 rounded border-border bg-background text-primary accent-primary"
              />
              <span className="text-sm text-foreground">
                {CONDITION_CONFIG[cond].label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Price Range
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              &#x20B9;
            </span>
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="pl-7 h-9 text-sm"
              min={0}
            />
          </div>
          <span className="text-muted-foreground text-xs">to</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              &#x20B9;
            </span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="pl-7 h-9 text-sm"
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read params
  const searchQuery = searchParams.get("search") || "";
  const categoryParam = searchParams.get("categoryId") || "";
  const conditionParam = searchParams.get("condition") || "";
  const sortParam = searchParams.get("sort") || "newest";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  // State
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter state (derived from URL)
  const selectedCategories = useMemo(
    () => new Set(categoryParam ? categoryParam.split(",") : []),
    [categoryParam]
  );
  const selectedConditions = useMemo(
    () => new Set(conditionParam ? conditionParam.split(",") : []),
    [conditionParam]
  );

  // Price filter state — stored locally, applied on change
  const [minPrice, setMinPrice] = useState(
    searchParams.get("minPrice") || ""
  );
  const [maxPrice, setMaxPrice] = useState(
    searchParams.get("maxPrice") || ""
  );

  // ── URL update helper ────────────────────────────────────────────────────

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 when filters change (unless page itself is changing)
      if (!("page" in updates)) {
        params.delete("page");
      }
      router.push(`/products?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // ── Filter handlers ──────────────────────────────────────────────────────

  const handleCategoryToggle = useCallback(
    (id: string) => {
      const next = new Set(selectedCategories);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      updateURL({
        categoryId: next.size > 0 ? Array.from(next).join(",") : null,
      });
    },
    [selectedCategories, updateURL]
  );

  const handleConditionToggle = useCallback(
    (c: string) => {
      const next = new Set(selectedConditions);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      updateURL({
        condition: next.size > 0 ? Array.from(next).join(",") : null,
      });
    },
    [selectedConditions, updateURL]
  );

  const handleClearFilters = useCallback(() => {
    setMinPrice("");
    setMaxPrice("");
    router.push("/products", { scroll: false });
  }, [router]);

  const handleSortChange = useCallback(
    (value: string) => {
      updateURL({ sort: value === "newest" ? null : value });
    },
    [updateURL]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateURL({ page: newPage > 1 ? String(newPage) : null });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateURL]
  );

  // Debounce price changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL({
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice]);

  // ── Fetch categories ─────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch {
        // silent
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // ── Fetch products ───────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        // API only supports single categoryId, so use the first one
        // For multiple categories, we filter client-side
        if (categoryParam) {
          const cats = categoryParam.split(",");
          if (cats.length === 1) {
            params.set("categoryId", cats[0]);
          }
          // If multiple, we fetch all and filter client-side
        }
        if (conditionParam && !conditionParam.includes(",")) {
          params.set("condition", conditionParam);
        }
        params.set("sort", sortParam);
        params.set("page", String(pageParam));
        params.set("limit", "18");

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          let prods: ProductListItem[] = data.data.products;

          // Client-side multi-condition filter
          if (conditionParam && conditionParam.includes(",")) {
            const condSet = new Set(conditionParam.split(","));
            prods = prods.filter((p) => condSet.has(p.condition));
          }

          // Client-side price filter
          const minP = minPrice ? parseInt(minPrice, 10) * 100 : null;
          const maxP = maxPrice ? parseInt(maxPrice, 10) * 100 : null;
          if (minP !== null) {
            prods = prods.filter((p) => p.price >= minP);
          }
          if (maxP !== null) {
            prods = prods.filter((p) => p.price <= maxP);
          }

          setProducts(prods);
          setPagination(data.data.pagination);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [searchQuery, categoryParam, conditionParam, sortParam, pageParam, minPrice, maxPrice]);

  // ── Render ───────────────────────────────────────────────────────────────

  const title = searchQuery
    ? `Search results for "${searchQuery}"`
    : "All Products";

  const filterContent = (
    <FilterContent
      categories={categories}
      selectedCategories={selectedCategories}
      selectedConditions={selectedConditions}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onCategoryToggle={handleCategoryToggle}
      onConditionToggle={handleConditionToggle}
      onMinPriceChange={setMinPrice}
      onMaxPriceChange={setMaxPrice}
      onClear={handleClearFilters}
      loading={categoriesLoading}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h1>
            {pagination && (
              <p className="text-sm text-muted-foreground mt-1">
                {pagination.total} product{pagination.total !== 1 ? "s" : ""}{" "}
                found
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile filter trigger */}
            <Dialog
              open={mobileFiltersOpen}
              onOpenChange={setMobileFiltersOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                  Filters
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filters</DialogTitle>
                </DialogHeader>
                {filterContent}
              </DialogContent>
            </Dialog>

            {/* Sort */}
            <Select value={sortParam} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout: sidebar + grid */}
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-8 rounded-xl border border-border bg-card p-5">
              {filterContent}
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No products found
                </h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  {searchQuery
                    ? `We couldn't find any products matching "${searchQuery}". Try adjusting your search or filters.`
                    : "Try adjusting your filters to see more products."}
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        handlePageChange(pagination.page - 1)
                      }
                      className="h-9 w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    )
                      .filter((p) => {
                        // Show first, last, and pages near current
                        return (
                          p === 1 ||
                          p === pagination.totalPages ||
                          Math.abs(p - pagination.page) <= 2
                        );
                      })
                      .map((p, idx, arr) => {
                        const showEllipsis =
                          idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && (
                              <span className="px-1 text-muted-foreground">
                                ...
                              </span>
                            )}
                            <Button
                              variant={
                                p === pagination.page
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(p)}
                              className={cn(
                                "h-9 w-9 p-0",
                                p === pagination.page &&
                                  "pointer-events-none"
                              )}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        );
                      })}

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={
                        pagination.page >= pagination.totalPages
                      }
                      onClick={() =>
                        handlePageChange(pagination.page + 1)
                      }
                      className="h-9 w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
