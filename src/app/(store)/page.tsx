"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
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
    <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border border-border shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Searching...
          </span>
        </div>
      )}

      {isEmpty && !loading && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}

      {!loading && results && (hasCategories || hasProducts) && (
        <div className="p-3">
          {/* Categories */}
          {hasCategories && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Categories ({results.categories.length})
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {results.categories.slice(0, 4).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?categoryId=${cat.id}`}
                    onClick={onClose}
                    className="flex-shrink-0 flex items-center gap-2 bg-secondary/80 hover:bg-secondary rounded-lg px-3 py-2 border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center border border-border">
                      {cat.imageUrl ? (
                        <Image
                          src={cat.imageUrl}
                          alt={cat.name}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {cat.name}
                    </span>
                  </Link>
                ))}
                {results.categories.length > 4 && (
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="flex-shrink-0 flex items-center gap-1 text-primary text-sm hover:underline px-2 py-2"
                  >
                    View more
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Products */}
          {hasProducts && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Products ({results.totalProducts})
              </p>
              <div className="space-y-1">
                {results.products.slice(0, 3).map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/80 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0 border border-border">
                      {product.image ? (
                        <Image
                          src={product.image.url}
                          alt={product.image.altText || product.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderTree className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {product.compareAtPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.compareAtPrice)}
                          </span>
                        )}
                        <span className="text-sm font-bold">
                          {product.price
                            ? formatPrice(product.price)
                            : "N/A"}
                        </span>
                      </div>
                      <ConditionBadge condition={product.condition} />
                    </div>
                  </Link>
                ))}
              </div>
              {results.totalProducts > 3 && (
                <Link
                  href={`/products?search=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-1 mt-2 py-2 text-primary text-sm font-medium hover:underline"
                >
                  View all {results.totalProducts} results
                  <ArrowRight className="h-3 w-3" />
                </Link>
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
            <Image
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
      {/* ── Section 1: Hero with Search ─────────────────────────────────────── */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Subtle radial gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-border bg-secondary/60 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
            Patna&apos;s Trusted Computer Shop
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom right, #fafafa 30%, #71717a 100%)",
              }}
            >
              Find Your Perfect
              <br />
              Computer Hardware
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-10">
            Laptops, Motherboards, Processors, RAM &amp; More &mdash; Quality
            Hardware at Best Prices
          </p>

          {/* Search Bar */}
          <div ref={searchRef} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                placeholder="Search products, categories..."
                className="w-full h-14 pl-12 pr-12 rounded-2xl bg-secondary/80 backdrop-blur border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                    setShowDropdown(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                      <Image
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
