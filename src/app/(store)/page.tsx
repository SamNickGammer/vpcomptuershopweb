"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { cn, formatPrice } from "@/lib/utils/helpers";
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
  name: string;
  slug: string;
  condition: "new" | "refurbished" | "used";
  price: number | null;
  compareAtPrice: number | null;
  image: { url: string; altText?: string } | null;
  inStock: boolean;
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
  name: string;
  slug: string;
  description: string | null;
  condition: "new" | "refurbished" | "used";
  categoryName: string | null;
  defaultVariant: {
    price: number;
    compareAtPrice: number | null;
    image: { url: string; altText?: string } | null;
    inStock: boolean;
  } | null;
  priceRange: { min: number; max: number };
};

// ── Condition Badge ──────────────────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, string> = {
    new: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    refurbished: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    used: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
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

// ── Search Dropdown ──────────────────────────────────────────────────────────

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
    <div className="absolute top-full left-0 right-0 mt-3 rounded-2xl border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 max-h-[75vh] overflow-hidden backdrop-blur-xl bg-[#0a0a0c]/95">
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="relative">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground/60">
            Searching for &ldquo;{query}&rdquo;...
          </span>
        </div>
      )}

      {isEmpty && !loading && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Search className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-muted-foreground/60 text-sm">
            No results for &ldquo;<span className="text-foreground/70">{query}</span>&rdquo;
          </p>
          <p className="text-muted-foreground/40 text-xs">Try a different search term</p>
        </div>
      )}

      {!loading && results && (hasCategories || hasProducts) && (
        <div className="overflow-y-auto max-h-[70vh]">
          {/* Categories */}
          {hasCategories && (
            <div className="px-2 pt-3 pb-2">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Categories
                </span>
                {results.categories.length > 4 && (
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
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
                    className="flex-shrink-0 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] hover:border-indigo-500/20 transition-all duration-200 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 overflow-hidden flex items-center justify-center border border-white/[0.06]">
                      {cat.imageUrl ? (
                        <ProductImage
                          src={cat.imageUrl}
                          alt={cat.name}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <FolderTree className="h-4 w-4 text-indigo-400/50" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground whitespace-nowrap transition-colors">
                      {cat.name}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-indigo-400/60 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {hasCategories && hasProducts && (
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          )}

          {/* Products */}
          {hasProducts && (
            <div className="px-2 py-2">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Products
                </span>
                <span className="text-[11px] text-muted-foreground/40">
                  {results.totalProducts} found
                </span>
              </div>
              <div className="space-y-0.5">
                {results.products.slice(0, 4).map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3.5 rounded-xl px-3 py-3 hover:bg-white/[0.04] transition-all duration-200 group"
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 overflow-hidden flex-shrink-0 border border-white/[0.04] group-hover:border-indigo-500/20 transition-colors">
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
                          <FolderTree className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground truncate transition-colors">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <ConditionBadge condition={product.condition} />
                        <span className={cn(
                          "text-[10px] font-medium flex items-center gap-1",
                          product.inStock ? "text-emerald-500/70" : "text-red-400/70"
                        )}>
                          <span className={cn(
                            "w-1 h-1 rounded-full",
                            product.inStock ? "bg-emerald-500" : "bg-red-400"
                          )} />
                          {product.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-sm font-bold text-foreground/90 font-mono">
                        {product.price ? formatPrice(product.price) : "N/A"}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-[11px] text-muted-foreground/50 line-through font-mono">
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
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/[0.06] hover:bg-indigo-500/[0.1] border border-indigo-500/10 text-indigo-400 text-sm font-medium transition-all duration-200 group"
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

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: FeaturedProduct }) {
  const image = product.defaultVariant?.image;
  const inStock = product.defaultVariant?.inStock ?? false;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
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
              <FolderTree className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
          {/* Condition badge */}
          <div className="absolute top-3 right-3">
            <ConditionBadge condition={product.condition} />
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="font-medium line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold">
              {product.defaultVariant
                ? formatPrice(product.defaultVariant.price)
                : "N/A"}
            </span>
            {product.defaultVariant?.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.defaultVariant.compareAtPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-medium flex items-center gap-1",
                inStock ? "text-emerald-400" : "text-red-400"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  inStock ? "bg-emerald-400" : "bg-red-400"
                )}
              />
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              View Details
              <ArrowRight className="h-3 w-3" />
            </span>
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
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
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
    <main className="min-h-screen">
      {/* ── Promo Ticker ──────────────────────────────────────────────────────── */}
      <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
        <div className="ticker-scroll flex items-center gap-12 whitespace-nowrap py-2 w-max">
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex items-center gap-12">
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Percent className="h-3.5 w-3.5" /> Up to 40% Off on Refurbished Laptops</span>
              <span className="text-primary/30">|</span>
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Truck className="h-3.5 w-3.5" /> Free Delivery Across Patna</span>
              <span className="text-primary/30">|</span>
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" /> All Products Quality Tested</span>
              <span className="text-primary/30">|</span>
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Timer className="h-3.5 w-3.5" /> Same Day Dispatch on Orders Before 2PM</span>
              <span className="text-primary/30">|</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 1: Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-x-clip">
        {/* Warm gradient background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 60% at 30% 20%, rgba(35,65,131,0.15) 0%, transparent 60%)"
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 50% 50% at 80% 70%, rgba(239,152,34,0.06) 0%, transparent 50%)"
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">

            {/* ── Left: Main promo + search (3 cols) ── */}
            <div className="lg:col-span-3 space-y-6">
              {/* Main Promo Banner */}
              <div className="hero-stagger-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2a52] via-[#162040] to-[#0e1019] border border-[#234183]/30 p-8 md:p-10">
                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#234183]/20 to-transparent rounded-tr-full" />

                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 bg-primary/20 rounded-full px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider mb-4">
                    <Percent className="h-3 w-3" /> Limited Time Offer
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] mb-4">
                    Refurbished Laptops
                    <br />
                    <span className="text-primary">Starting ₹12,999</span>
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base max-w-md mb-6 leading-relaxed">
                    Dell, HP, Lenovo &amp; more — professionally restored with 6-month warranty. Save big on quality hardware.
                  </p>
                  <Link
                    href="/products?condition=refurbished"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-primary/20"
                  >
                    Shop Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Search Bar */}
              <div ref={searchRef} className="hero-stagger-2 relative">
                <div className="relative search-glow rounded-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                    placeholder="Search laptops, processors, RAM, motherboards..."
                    className="w-full h-13 pl-12 pr-12 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setSearchResults(null); setShowDropdown(false); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <SearchDropdown
                    results={searchResults}
                    loading={searchLoading}
                    query={searchQuery}
                    onClose={() => setShowDropdown(false)}
                  />
                )}
              </div>

              {/* Popular searches */}
              {!showDropdown && (
                <div className="hero-stagger-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground/50">Trending:</span>
                  {["Dell Latitude", "i5 Processor", "8GB RAM", "256GB SSD", "Motherboard"].map((tag) => (
                    <Link
                      key={tag}
                      href={`/products?search=${encodeURIComponent(tag)}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-secondary border border-border hover:border-primary/40 hover:text-primary transition-all"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: Deal cards (2 cols) ── */}
            <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-4">
              {/* Deal Card 1 */}
              <Link href="/products?condition=new" className="hero-stagger-3 group block">
                <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Laptop className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">New Arrivals</span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">Brand New Laptops</h3>
                  <p className="text-xs text-muted-foreground mb-3">ASUS, HP, Lenovo, Dell</p>
                  <p className="text-lg font-bold text-primary">From ₹29,999</p>
                </div>
              </Link>

              {/* Deal Card 2 */}
              <Link href="/products?search=processor" className="hero-stagger-4 group block">
                <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <BadgeCheck className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Components</span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">Processors & RAM</h3>
                  <p className="text-xs text-muted-foreground mb-3">Intel & AMD, DDR4</p>
                  <p className="text-lg font-bold text-primary">From ₹3,499</p>
                </div>
              </Link>

              {/* Deal Card 3 */}
              <Link href="/products?search=motherboard" className="hero-stagger-5 group block col-span-2 lg:col-span-1">
                <div className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Bestsellers</span>
                      </div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Motherboards & Storage</h3>
                      <p className="text-xs text-muted-foreground mt-1">Gigabyte, ASUS, Samsung, WD</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Trust Strip */}
          <div className="hero-stagger-5 mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck, text: "Quality Tested", sub: "Every product inspected" },
              { icon: Truck, text: "Fast Delivery", sub: "Across Bihar" },
              { icon: IndianRupee, text: "Best Prices", sub: "Guaranteed lowest" },
              { icon: Headphones, text: "Expert Support", sub: "Call or WhatsApp" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl bg-secondary/50 border border-border/50 px-4 py-3">
                <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.text}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Categories ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              Shop by Category
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
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
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-border overflow-hidden bg-secondary flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-primary">
                    {cat.imageUrl ? (
                      <ProductImage
                        src={cat.imageUrl}
                        alt={cat.name}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FolderTree className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 3: Featured Products ────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold">
                Featured Products
              </h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Link
              href="/products"
              className="text-sm text-primary hover:underline flex items-center gap-1 ml-4 flex-shrink-0"
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
                  className="bg-card rounded-xl border border-border overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-secondary" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-secondary rounded w-3/4" />
                    <div className="h-5 bg-secondary rounded w-1/2" />
                    <div className="h-3 bg-secondary rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
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

      {/* ── Section 4: Trust Badges ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Products",
                desc: "Every product is tested and quality-checked before listing",
                color: "text-emerald-400 bg-emerald-400/10",
              },
              {
                icon: IndianRupee,
                title: "Best Prices",
                desc: "Competitive pricing on all new and refurbished hardware",
                color: "text-amber-400 bg-amber-400/10",
              },
              {
                icon: Truck,
                title: "Fast Delivery",
                desc: "Quick shipping across Patna and all of Bihar",
                color: "text-blue-400 bg-blue-400/10",
              },
              {
                icon: Headphones,
                title: "Expert Support",
                desc: "Get help from our experienced hardware specialists",
                color: "text-purple-400 bg-purple-400/10",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card rounded-xl border border-border p-6 text-center hover:border-primary/30 transition-colors"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                    item.color
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Testimonials ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              What Our Customers Say
            </h2>
            <div className="flex-1 h-px bg-border" />
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
                className="bg-card rounded-xl border border-border p-6 hover:border-primary/30 transition-colors"
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
                <p className="text-foreground leading-relaxed mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Newsletter CTA ───────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Stay Updated</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Get notified about new arrivals, deals, and restocks.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-11 px-4 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
              />
              <button className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
