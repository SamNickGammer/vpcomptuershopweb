"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { useCart } from "@/hooks/useCart";
import {
  Search,
  FolderTree,
  ShieldCheck,
  IndianRupee,
  Truck,
  Headphones,
  Star,
  Loader2,
  ArrowRight,
  Mail,
  X,
  ChevronRight,
  Percent,
  BadgeCheck,
  Timer,
  Laptop,
  ShoppingCart,
  RotateCcw,
  Lock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type CategoryResult = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

type SearchProduct = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  condition: "new" | "refurbished" | "used";
  price: number | null;
  compareAtPrice: number | null;
  image: { url: string; altText?: string } | null;
  inStock: boolean;
  label: string | null;
};

type SearchResults = {
  categories: CategoryResult[];
  products: SearchProduct[];
  totalProducts: number;
};

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};

type FeaturedProduct = {
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
};

// ── Condition Badge (light theme) ────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, string> = {
    new: "bg-emerald-50 text-emerald-700 border-emerald-200",
    refurbished: "bg-amber-50 text-amber-700 border-amber-200",
    used: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        styles[condition] || styles.used
      )}
    >
      {condition}
    </span>
  );
}

// ── Search Dropdown (light theme) ────────────────────────────────────────────

function SearchDropdown({
  results,
  loading,
  query,
  onClose,
}: {
  results: SearchResults | null;
  loading: boolean;
  query: string;
  onClose: () => void;
}) {
  if (!query || query.length < 2) return null;

  const hasCategories = results && results.categories.length > 0;
  const hasProducts = results && results.products.length > 0;
  const isEmpty = results && !hasCategories && !hasProducts;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[#e5e7eb] shadow-xl z-50 max-h-[75vh] overflow-hidden bg-white">
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#EF9822]/20 border-t-[#EF9822] animate-spin" />
          <span className="text-sm text-[#6b7280]">
            Searching for &ldquo;{query}&rdquo;...
          </span>
        </div>
      )}

      {isEmpty && !loading && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Search className="h-8 w-8 text-[#d1d5db]" />
          <p className="text-[#6b7280] text-sm">
            No results for &ldquo;
            <span className="text-[#1a1a1a]">{query}</span>&rdquo;
          </p>
          <p className="text-[#9ca3af] text-xs">Try a different search term</p>
        </div>
      )}

      {!loading && results && (hasCategories || hasProducts) && (
        <div className="overflow-y-auto max-h-[70vh]">
          {/* Categories */}
          {hasCategories && (
            <div className="px-2 pt-3 pb-2">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">
                  Categories
                </span>
                {results.categories.length > 4 && (
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="text-[11px] text-[#EF9822] hover:underline transition-colors"
                  >
                    View all
                  </Link>
                )}
              </div>
              <div className="flex gap-1.5 px-1 overflow-x-auto pb-1">
                {results.categories.slice(0, 4).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?categoryId=${cat.id}`}
                    onClick={onClose}
                    className="flex-shrink-0 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 bg-[#f9fafb] hover:bg-[#f3f4f6] border border-[#e5e7eb] hover:border-[#EF9822]/30 transition-all duration-200 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#f3f4f6] overflow-hidden flex items-center justify-center border border-[#e5e7eb]">
                      {cat.imageUrl ? (
                        <ProductImage
                          src={cat.imageUrl}
                          alt={cat.name}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <FolderTree className="h-4 w-4 text-[#9ca3af]" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-[#374151] group-hover:text-[#1a1a1a] whitespace-nowrap transition-colors">
                      {cat.name}
                    </span>
                    <ChevronRight className="h-3 w-3 text-[#d1d5db] group-hover:text-[#EF9822] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {hasCategories && hasProducts && (
            <div className="mx-4 h-px bg-[#e5e7eb]" />
          )}

          {/* Products */}
          {hasProducts && (
            <div className="px-2 py-2">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">
                  Products
                </span>
                <span className="text-[11px] text-[#9ca3af]">
                  {results.totalProducts} found
                </span>
              </div>
              <div className="space-y-0.5">
                {results.products.slice(0, 4).map((product) => (
                  <Link
                    key={product.id}
                    href={product.variantId ? `/products/${product.slug}?variant=${product.variantId}` : `/products/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3.5 rounded-lg px-3 py-3 hover:bg-[#f9fafb] transition-all duration-200 group"
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg bg-[#f3f4f6] overflow-hidden flex-shrink-0 border border-[#e5e7eb] group-hover:border-[#EF9822]/30 transition-colors">
                      {product.image ? (
                        <ProductImage
                          src={product.image.url}
                          alt={product.image.altText || product.name}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderTree className="h-5 w-5 text-[#d1d5db]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#374151] group-hover:text-[#1a1a1a] truncate transition-colors">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <ConditionBadge condition={product.condition} />
                        <span
                          className={cn(
                            "text-[10px] font-medium flex items-center gap-1",
                            product.inStock
                              ? "text-emerald-600"
                              : "text-red-500"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1 h-1 rounded-full",
                              product.inStock ? "bg-emerald-500" : "bg-red-500"
                            )}
                          />
                          {product.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-sm font-bold text-[#1a1a1a] font-mono">
                        {product.price ? formatPrice(product.price) : "N/A"}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-[11px] text-[#9ca3af] line-through font-mono">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* View all results */}
              {results.totalProducts > 4 && (
                <div className="px-1 pt-1 pb-1">
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#FFF3E0] hover:bg-[#FFECCC] border border-[#EF9822]/20 text-[#EF9822] text-sm font-medium transition-all duration-200 group"
                  >
                    View all {results.totalProducts} results
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Product Card (light theme) ───────────────────────────────────────────────

function ProductCard({ product }: { product: FeaturedProduct }) {
  const image = product.image;
  const inStock = product.inStock;
  const { addItem } = useCart();

  const productLink = product.variantId
    ? `/products/${product.slug}?variant=${product.variantId}`
    : `/products/${product.slug}`;

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) /
            product.compareAtPrice) *
            100
        )
      : null;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem({
      variantId: product.variantId || product.productId,
      productId: product.productId,
      productName: product.name,
      productSlug: product.slug,
      variantName: product.label || "Default",
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: image?.url ?? null,
      quantity: 1,
    });
  }

  return (
    <Link href={productLink} className="group block">
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm hover:shadow-md hover:border-[#EF9822]/40 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-[#f9fafb] overflow-hidden">
          {image ? (
            <ProductImage
              src={image.url}
              alt={image.altText || product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderTree className="h-10 w-10 text-[#d1d5db]" />
            </div>
          )}
          {/* Condition badge */}
          <div className="absolute top-3 left-3">
            <ConditionBadge condition={product.condition} />
          </div>
          {/* Discount badge */}
          {discount && (
            <div className="absolute top-3 right-3 bg-[#EF9822] text-white text-xs font-bold px-2 py-1 rounded-md">
              -{discount}%
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {/* Category */}
          {product.categoryName && (
            <p className="text-[11px] uppercase tracking-wider text-[#9ca3af] mb-1">
              {product.categoryName}
            </p>
          )}
          <p className="font-medium text-[#1a1a1a] line-clamp-2 leading-snug mb-3 group-hover:text-[#EF9822] transition-colors">
            {product.name}
          </p>

          {/* Prices */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-[#EF9822]">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.price && (
                <span className="text-sm text-[#9ca3af] line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
          </div>

          {/* Stock + Add to Cart */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-medium flex items-center gap-1",
                inStock ? "text-emerald-600" : "text-red-500"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  inStock ? "bg-emerald-500" : "bg-red-500"
                )}
              />
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
            {inStock ? (
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-1.5 bg-[#EF9822] hover:bg-[#d9881d] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <ShoppingCart className="h-3 w-3" />
                Add to Cart
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-[#EF9822] font-medium">
                View
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main Homepage ────────────────────────────────────────────────────────────

export default function HomePage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(
    null
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Data state
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>(
    []
  );
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch categories & featured products on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
      })
      .catch(console.error)
      .finally(() => setCategoriesLoading(false));

    fetch("/api/products?featured=true&limit=8")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFeaturedProducts(data.data.products);
      })
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, []);

  // Search with debounce
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDropdown(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* ── Section 1: Promo Ticker ─────────────────────────────────────────── */}
      <div className="bg-[#EF9822] overflow-hidden">
        <div className="ticker-scroll flex items-center gap-12 whitespace-nowrap py-2 w-max">
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex items-center gap-12">
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <Percent className="h-3.5 w-3.5" /> Up to 40% Off on
                Refurbished Laptops
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <Truck className="h-3.5 w-3.5" /> Free Delivery Across Patna
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <BadgeCheck className="h-3.5 w-3.5" /> All Products Quality
                Tested
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <Timer className="h-3.5 w-3.5" /> Same Day Dispatch on Orders
                Before 2PM
              </span>
              <span className="text-white/40">|</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Hero Banner Area ─────────────────────────────────────── */}
      <section className="bg-[#f9fafb] border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
            {/* Main Promo Banner (left ~65%) */}
            <div className="lg:col-span-3">
              <div className="hero-stagger-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#234183] via-[#1d3570] to-[#162a5e] p-8 md:p-10 h-full min-h-[280px] flex flex-col justify-center">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#EF9822]/20 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 to-transparent rounded-tr-full" />

                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 bg-[#EF9822]/20 rounded-full px-3 py-1 text-xs font-bold text-[#EF9822] uppercase tracking-wider mb-4">
                    <Percent className="h-3 w-3" /> Limited Time Offer
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] mb-4 text-white">
                    Refurbished Laptops
                    <br />
                    <span className="text-[#EF9822]">Starting ₹12,999</span>
                  </h1>
                  <p className="text-white/70 text-sm md:text-base max-w-md mb-6 leading-relaxed">
                    Dell, HP, Lenovo &amp; more — professionally restored with
                    6-month warranty. Save big on quality hardware.
                  </p>
                  <Link
                    href="/products?condition=refurbished"
                    className="inline-flex items-center gap-2 bg-[#EF9822] hover:bg-[#d9881d] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#EF9822]/30"
                  >
                    Shop Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Side Cards (right ~35%) */}
            <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-4">
              {/* Deal Card 1 */}
              <Link
                href="/products?condition=new"
                className="hero-stagger-2 group block"
              >
                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 hover:border-[#EF9822]/40 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <Laptop className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      New Arrivals
                    </span>
                  </div>
                  <h3 className="font-bold text-[#1a1a1a] mb-1 group-hover:text-[#EF9822] transition-colors">
                    Brand New Laptops
                  </h3>
                  <p className="text-xs text-[#6b7280] mb-3">
                    ASUS, HP, Lenovo, Dell
                  </p>
                  <p className="text-lg font-bold text-[#EF9822]">
                    From ₹29,999
                  </p>
                </div>
              </Link>

              {/* Deal Card 2 */}
              <Link
                href="/products?search=processor"
                className="hero-stagger-3 group block"
              >
                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 hover:border-[#EF9822]/40 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <BadgeCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      Components
                    </span>
                  </div>
                  <h3 className="font-bold text-[#1a1a1a] mb-1 group-hover:text-[#EF9822] transition-colors">
                    Processors &amp; RAM
                  </h3>
                  <p className="text-xs text-[#6b7280] mb-3">
                    Intel &amp; AMD, DDR4
                  </p>
                  <p className="text-lg font-bold text-[#EF9822]">
                    From ₹3,499
                  </p>
                </div>
              </Link>

              {/* Deal Card 3 */}
              <Link
                href="/products?search=motherboard"
                className="hero-stagger-4 group block col-span-2 lg:col-span-1"
              >
                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 hover:border-[#EF9822]/40 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-[#FFF3E0]">
                          <ShieldCheck className="h-4 w-4 text-[#EF9822]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#EF9822]">
                          Bestsellers
                        </span>
                      </div>
                      <h3 className="font-bold text-[#1a1a1a] group-hover:text-[#EF9822] transition-colors">
                        Motherboards &amp; Storage
                      </h3>
                      <p className="text-xs text-[#6b7280] mt-1">
                        Gigabyte, ASUS, Samsung, WD
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#d1d5db] group-hover:text-[#EF9822] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Trust Strip */}
          <div className="hero-stagger-5 mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: Truck,
                text: "Free Shipping",
                sub: "On orders across Patna",
              },
              {
                icon: ShieldCheck,
                text: "Genuine Products",
                sub: "Every item quality tested",
              },
              {
                icon: RotateCcw,
                text: "Easy Returns",
                sub: "7-day return policy",
              },
              {
                icon: Lock,
                text: "Secure Payment",
                sub: "100% protected checkout",
              },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl bg-white border border-[#e5e7eb] px-4 py-3"
              >
                <div className="p-2 rounded-lg bg-[#FFF3E0]">
                  <item.icon className="h-4 w-4 text-[#EF9822]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1a1a1a]">
                    {item.text}
                  </p>
                  <p className="text-[10px] text-[#6b7280]">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Categories Grid ──────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#234183]">
              Shop by Category
            </h2>
            <div className="flex-1 h-px bg-[#e5e7eb]" />
            <Link
              href="/categories"
              className="text-sm text-[#EF9822] hover:underline flex items-center gap-1 flex-shrink-0"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#6b7280]" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-[#6b7280] py-12">
              No categories available yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="group flex flex-col items-center gap-3"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[#e5e7eb] overflow-hidden bg-[#f9fafb] flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-[#EF9822] group-hover:shadow-md">
                    {cat.imageUrl ? (
                      <ProductImage
                        src={cat.imageUrl}
                        alt={cat.name}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FolderTree className="h-7 w-7 md:h-8 md:w-8 text-[#9ca3af] group-hover:text-[#EF9822] transition-colors" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center text-[#4b5563] group-hover:text-[#1a1a1a] transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 4: Featured Products ────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-[#f9fafb] border-y border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-[#234183]">
                Featured Products
              </h2>
              <div className="flex-1 h-px bg-[#e5e7eb]" />
            </div>
            <Link
              href="/products"
              className="text-sm text-[#EF9822] hover:underline flex items-center gap-1 ml-4 flex-shrink-0"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#f3f4f6]" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-[#f3f4f6] rounded w-3/4" />
                    <div className="h-5 bg-[#f3f4f6] rounded w-1/2" />
                    <div className="h-3 bg-[#f3f4f6] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <p className="text-center text-[#6b7280] py-12">
              No featured products yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 5: Full-Width Promo Banner ──────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#234183] to-[#1d3570]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Looking for Computer Components?
              </h2>
              <p className="text-white/70 text-sm md:text-base max-w-lg">
                Motherboards, processors, RAM, SSDs, graphics cards, and more.
                All genuine products with warranty.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-[#EF9822] hover:bg-[#d9881d] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg whitespace-nowrap"
            >
              Browse All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 6: Trust / Why Choose Us ────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#234183] mb-2">
              Why Choose V&P Computer?
            </h2>
            <p className="text-[#6b7280] text-sm max-w-lg mx-auto">
              Trusted by hundreds of customers in Patna and across Bihar
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Products",
                desc: "Every product is tested and quality-checked before listing",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: IndianRupee,
                title: "Best Prices",
                desc: "Competitive pricing on all new and refurbished hardware",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Truck,
                title: "Fast Delivery",
                desc: "Quick shipping across Patna and all of Bihar",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Headphones,
                title: "Expert Support",
                desc: "Get help from our experienced hardware specialists",
                color: "bg-purple-50 text-purple-600",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl border border-[#e5e7eb] p-6 text-center hover:border-[#EF9822]/30 hover:shadow-md transition-all"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                    item.color
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-[#f9fafb] border-y border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#234183]">
              What Our Customers Say
            </h2>
            <div className="flex-1 h-px bg-[#e5e7eb]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "Got a refurbished Dell Latitude in excellent condition. Running perfectly for 6 months now!",
                name: "Rahul Sharma",
                location: "Patna",
              },
              {
                quote:
                  "Best prices for computer components in Bihar. Ordered RAM and SSD, delivered next day!",
                name: "Priya Singh",
                location: "Gaya",
              },
              {
                quote:
                  "V&P is my go-to shop for all hardware needs. Genuine products and great after-sale support.",
                name: "Amit Kumar",
                location: "Muzaffarpur",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white rounded-xl border border-[#e5e7eb] p-6 hover:shadow-md transition-all"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-[#1a1a1a] leading-relaxed mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <p className="font-medium text-sm text-[#1a1a1a]">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Newsletter ───────────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-[#f9fafb] rounded-2xl border border-[#e5e7eb] p-8 md:p-12">
            <div className="w-12 h-12 rounded-full bg-[#FFF3E0] flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-[#EF9822]" />
            </div>
            <h2 className="text-2xl font-bold text-[#234183] mb-2">
              Stay Updated
            </h2>
            <p className="text-[#6b7280] text-sm mb-6">
              Get notified about new arrivals, deals, and restocks.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-11 px-4 rounded-lg bg-white border border-[#e5e7eb] text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#EF9822]/40 focus:border-[#EF9822] transition-all text-sm"
              />
              <button className="h-11 px-6 rounded-lg bg-[#EF9822] text-white font-medium text-sm hover:bg-[#d9881d] transition-colors flex-shrink-0">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Inline Search (hero area, for mobile/SEO) ───────────────────────── */}
      <div className="hidden">
        {/* Search functionality preserved for programmatic use */}
        <div ref={searchRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() =>
              searchQuery.length >= 2 && setShowDropdown(true)
            }
          />
          {showDropdown && (
            <SearchDropdown
              results={searchResults}
              loading={searchLoading}
              query={searchQuery}
              onClose={() => setShowDropdown(false)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
