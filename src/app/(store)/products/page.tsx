"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils/helpers";
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
  name: string;
  slug: string;
  description: string | null;
  condition: "new" | "refurbished" | "used";
  categoryId: string | null;
  categoryName: string | null;
  isFeatured: boolean;
  defaultVariant: {
    price: number;
    compareAtPrice: number | null;
    image: { url: string; altText?: string } | null;
    inStock: boolean;
  } | null;
  variantsCount: number;
  priceRange: { min: number; max: number };
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
  const variant = product.defaultVariant;
  const conditionCfg = CONDITION_CONFIG[product.condition];
  const hasDiscount =
    variant?.compareAtPrice && variant.compareAtPrice > variant.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((variant.compareAtPrice! - variant.price) / variant.compareAtPrice!) *
          100
      )
    : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted/50 overflow-hidden">
        {variant?.image?.url ? (
          <Image
            src={variant.image.url}
            alt={variant.image.altText || product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Condition badge */}
        <div className="absolute top-3 left-3">
          <Badge variant={conditionCfg.variant} className="text-[11px]">
            {conditionCfg.label}
          </Badge>
        </div>

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-3 right-3">
            <Badge variant="destructive" className="text-[11px]">
              -{discountPct}%
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 space-y-2">
        {product.categoryName && (
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {product.categoryName}
          </span>
        )}

        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mt-auto pt-1">
          {variant ? (
            <>
              <span className="text-lg font-bold text-primary">
                {formatPrice(variant.price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(variant.compareAtPrice!)}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Price unavailable
            </span>
          )}
        </div>

        {/* Stock */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              variant?.inStock ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          <span
            className={cn(
              "text-xs",
              variant?.inStock ? "text-emerald-400" : "text-red-400"
            )}
          >
            {variant?.inStock ? "In Stock" : "Out of Stock"}
          </span>
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

          // Client-side multi-category filter
          if (categoryParam && categoryParam.includes(",")) {
            const catSet = new Set(categoryParam.split(","));
            prods = prods.filter(
              (p) => p.categoryId && catSet.has(p.categoryId)
            );
          }

          // Client-side multi-condition filter
          if (conditionParam && conditionParam.includes(",")) {
            const condSet = new Set(conditionParam.split(","));
            prods = prods.filter((p) => condSet.has(p.condition));
          }

          // Client-side price filter
          const minP = minPrice ? parseInt(minPrice, 10) * 100 : null;
          const maxP = maxPrice ? parseInt(maxPrice, 10) * 100 : null;
          if (minP !== null) {
            prods = prods.filter(
              (p) => (p.defaultVariant?.price ?? 0) >= minP
            );
          }
          if (maxP !== null) {
            prods = prods.filter(
              (p) => (p.defaultVariant?.price ?? 0) <= maxP
            );
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
