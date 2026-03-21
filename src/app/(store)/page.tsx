"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { cn, formatPrice } from "@/lib/utils/helpers";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
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
  Heart,
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
    new: "bg-green-500 text-white",
    refurbished: "bg-amber-500 text-white",
    used: "bg-gray-500 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm",
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
    <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[gray-200] shadow-xl z-50 max-h-[75vh] overflow-hidden bg-white">
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#d97706]/20 border-t-[#d97706] animate-spin" />
          <span className="text-sm text-gray-500">
            Searching for &ldquo;{query}&rdquo;...
          </span>
        </div>
      )}

      {isEmpty && !loading && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Search className="h-8 w-8 text-gray-300" />
          <p className="text-gray-500 text-sm">
            No results for &ldquo;
            <span className="text-gray-900">{query}</span>&rdquo;
          </p>
          <p className="text-gray-400 text-xs">Try a different search term</p>
        </div>
      )}

      {!loading && results && (hasCategories || hasProducts) && (
        <div className="overflow-y-auto max-h-[70vh]">
          {/* Categories */}
          {hasCategories && (
            <div className="px-2 pt-3 pb-2">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Categories
                </span>
                {results.categories.length > 4 && (
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="text-[11px] text-[#d97706] hover:underline transition-colors"
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
                    className="flex-shrink-0 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-[gray-200] hover:border-[#d97706]/30 transition-all duration-200 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-[gray-200]">
                      {cat.imageUrl ? (
                        <ProductImage
                          src={cat.imageUrl}
                          alt={cat.name}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <FolderTree className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 whitespace-nowrap transition-colors">
                      {cat.name}
                    </span>
                    <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-[#d97706] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {hasCategories && hasProducts && (
            <div className="mx-4 h-px bg-[gray-200]" />
          )}

          {/* Products */}
          {hasProducts && (
            <div className="px-2 py-2">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Products
                </span>
                <span className="text-[11px] text-gray-400">
                  {results.totalProducts} found
                </span>
              </div>
              <div className="space-y-0.5">
                {results.products.slice(0, 4).map((product) => (
                  <Link
                    key={product.id}
                    href={product.variantId ? `/products/${product.slug}?variant=${product.variantId}` : `/products/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3.5 rounded-lg px-3 py-3 hover:bg-gray-50 transition-all duration-200 group"
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-[gray-200] group-hover:border-[#d97706]/30 transition-colors">
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
                          <FolderTree className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate transition-colors">
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
                      <span className="text-sm font-bold text-gray-900 font-mono">
                        {product.price ? formatPrice(product.price) : "N/A"}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-[11px] text-gray-400 line-through font-mono">
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
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-[#d97706]/20 text-[#d97706] text-sm font-medium transition-all duration-200 group"
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
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.productId, product.variantId);

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

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.productId, product.variantId);
  }

  return (
    <Link href={productLink} className="group block">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300">
        {/* Image with overlay */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {image ? (
            <>
              <ProductImage
                src={image.url}
                alt={image.altText || product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              {/* Gradient overlay for badge visibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10 pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <FolderTree className="h-10 w-10 text-gray-300" />
            </div>
          )}

          {/* Top row: condition + discount */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
            <ConditionBadge condition={product.condition} />
            {discount && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                -{discount}%
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
                wishlisted
                  ? "fill-red-500 text-red-500"
                  : "text-gray-500 hover:text-red-400"
              )}
            />
          </button>
        </div>

        {/* Info */}
        <div className="p-3.5">
          {/* Category */}
          {product.categoryName && (
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">
              {product.categoryName}
            </p>
          )}

          {/* Name */}
          <h3 className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-snug mb-2 group-hover:text-gray-900 transition-colors min-h-[36px]">
            {product.name}
          </h3>

          {/* Price + Stock + Cart */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.compareAtPrice &&
                  product.compareAtPrice > product.price && (
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(product.compareAtPrice)}
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={cn("w-1.5 h-1.5 rounded-full", inStock ? "bg-green-500" : "bg-red-400")} />
                <span className={cn("text-[10px] font-medium", inStock ? "text-green-600" : "text-red-500")}>
                  {inStock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>
            {inStock && (
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
      <div className="bg-[#d97706] overflow-hidden">
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
      <section className="bg-gray-50 border-b border-[gray-200]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
            {/* Main Promo Banner (left ~65%) */}
            <div className="lg:col-span-3">
              <div className="hero-stagger-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#234183] via-[#1d3570] to-[#162a5e] p-8 md:p-10 h-full min-h-[280px] flex flex-col justify-center">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#d97706]/20 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 to-transparent rounded-tr-full" />

                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 bg-[#d97706]/20 rounded-full px-3 py-1 text-xs font-bold text-[#d97706] uppercase tracking-wider mb-4">
                    <Percent className="h-3 w-3" /> Limited Time Offer
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] mb-4 text-white">
                    Refurbished Laptops
                    <br />
                    <span className="text-[#d97706]">Starting ₹12,999</span>
                  </h1>
                  <p className="text-white/70 text-sm md:text-base max-w-md mb-6 leading-relaxed">
                    Dell, HP, Lenovo &amp; more — professionally restored with
                    6-month warranty. Save big on quality hardware.
                  </p>
                  <Link
                    href="/products?condition=refurbished"
                    className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#d97706]/30"
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
                <div className="rounded-2xl border border-[gray-200] bg-white p-5 hover:border-[#d97706]/40 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <Laptop className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      New Arrivals
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#d97706] transition-colors">
                    Brand New Laptops
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    ASUS, HP, Lenovo, Dell
                  </p>
                  <p className="text-lg font-bold text-[#d97706]">
                    From ₹29,999
                  </p>
                </div>
              </Link>

              {/* Deal Card 2 */}
              <Link
                href="/products?search=processor"
                className="hero-stagger-3 group block"
              >
                <div className="rounded-2xl border border-[gray-200] bg-white p-5 hover:border-[#d97706]/40 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <BadgeCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      Components
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#d97706] transition-colors">
                    Processors &amp; RAM
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Intel &amp; AMD, DDR4
                  </p>
                  <p className="text-lg font-bold text-[#d97706]">
                    From ₹3,499
                  </p>
                </div>
              </Link>

              {/* Deal Card 3 */}
              <Link
                href="/products?search=motherboard"
                className="hero-stagger-4 group block col-span-2 lg:col-span-1"
              >
                <div className="rounded-2xl border border-[gray-200] bg-white p-5 hover:border-[#d97706]/40 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-amber-50">
                          <ShieldCheck className="h-4 w-4 text-[#d97706]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#d97706]">
                          Bestsellers
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[#d97706] transition-colors">
                        Motherboards &amp; Storage
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Gigabyte, ASUS, Samsung, WD
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-[#d97706] group-hover:translate-x-1 transition-all" />
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
                className="flex items-center gap-3 rounded-xl bg-white border border-[gray-200] px-4 py-3"
              >
                <div className="p-2 rounded-lg bg-amber-50">
                  <item.icon className="h-4 w-4 text-[#d97706]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {item.text}
                  </p>
                  <p className="text-[10px] text-gray-500">{item.sub}</p>
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Shop by Category
            </h2>
            <div className="flex-1 h-px bg-[gray-200]" />
            <Link
              href="/categories"
              className="text-sm text-[#d97706] hover:underline flex items-center gap-1 flex-shrink-0"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
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
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[gray-200] overflow-hidden bg-gray-50 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-[#d97706] group-hover:shadow-md">
                    {cat.imageUrl ? (
                      <ProductImage
                        src={cat.imageUrl}
                        alt={cat.name}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FolderTree className="h-7 w-7 md:h-8 md:w-8 text-gray-400 group-hover:text-[#d97706] transition-colors" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center text-gray-600 group-hover:text-gray-900 transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 4: Featured Products ────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-gray-50 border-y border-[gray-200]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Featured Products
              </h2>
              <div className="flex-1 h-px bg-[gray-200]" />
            </div>
            <Link
              href="/products"
              className="text-sm text-[#d97706] hover:underline flex items-center gap-1 ml-4 flex-shrink-0"
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
                  className="bg-white rounded-xl border border-[gray-200] overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-5 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
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
              className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg whitespace-nowrap"
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Why Choose V&P Computer?
            </h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
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
                className="bg-white rounded-xl border border-[gray-200] p-6 text-center hover:border-[#d97706]/30 hover:shadow-md transition-all"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                    item.color
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-gray-50 border-y border-[gray-200]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              What Our Customers Say
            </h2>
            <div className="flex-1 h-px bg-[gray-200]" />
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
                className="bg-white rounded-xl border border-[gray-200] p-6 hover:shadow-md transition-all"
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
                <p className="text-gray-900 leading-relaxed mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-gray-500">
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
          <div className="bg-gray-50 rounded-2xl border border-[gray-200] p-8 md:p-12">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-[#d97706]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Stay Updated
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Get notified about new arrivals, deals, and restocks.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-11 px-4 rounded-lg bg-white border border-[gray-200] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d97706]/40 focus:border-[#d97706] transition-all text-sm"
              />
              <button className="h-11 px-6 rounded-lg bg-[#d97706] text-white font-medium text-sm hover:bg-[#b45309] transition-colors flex-shrink-0">
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
