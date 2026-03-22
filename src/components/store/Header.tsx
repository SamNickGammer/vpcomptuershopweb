"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ProductImage } from "@/components/ui/product-image";
import { formatPrice } from "@/lib/utils/helpers";
import {
  ShoppingBag,
  UserCircle,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Search,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import CartSidebar from "./CartSidebar";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/track-order", label: "Track Order" },
  { href: "/products?featured=true", label: "Deals" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    categories: Array<{ id: string; name: string; slug: string; imageUrl: string | null }>;
    products: Array<{
      id: string; productId: string; variantId: string | null;
      name: string; slug: string; condition: string; categoryName: string | null;
      price: number; compareAtPrice: number | null;
      image: { url: string; altText?: string } | null; inStock: boolean;
    }>;
    totalProducts: number;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { items, totalItems, totalPrice, updateQuantity, removeItem } =
    useCart();
  const { user, loading, openAuthModal, logout } = useAuth();
  const { totalItems: wishlistCount } = useWishlist();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  function handleLogout() {
    setUserDropdownOpen(false);
    logout();
  }

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch { /* ignore */ } finally { setSearchLoading(false); }
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 250);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-2">
            <Image
              src="/logo/LOGO_v&P.svg"
              alt="V&P Computer"
              width={140}
              height={36}
              className="h-8 w-auto"
              priority
              unoptimized
            />
          </Link>

          {/* Nav Links (desktop) — hidden when search is open */}
          <nav
            className={cn(
              "hidden md:flex items-center gap-0.5 flex-1 transition-all duration-300",
              searchOpen ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"
            )}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap",
                  isActive(link.href)
                    ? "text-[#b45309] bg-amber-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Expandable Search (desktop) */}
          <div
            ref={searchContainerRef}
            className={cn(
              "hidden md:flex items-center transition-all duration-300 ease-in-out",
              searchOpen ? "flex-1 mx-2" : "flex-none"
            )}
          >
            {searchOpen ? (
              <div className="relative w-full">
                <form onSubmit={handleSearchSubmit}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search laptops, processors, RAM..."
                    className="w-full h-9 pl-10 pr-10 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults(null); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>

                {/* Live search dropdown */}
                {searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
                    {searchLoading && (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-amber-500 animate-spin" />
                      </div>
                    )}

                    {!searchLoading && searchResults && searchResults.categories.length === 0 && searchResults.products.length === 0 && (
                      <div className="py-8 text-center">
                        <Search className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No results for &ldquo;{searchQuery}&rdquo;</p>
                      </div>
                    )}

                    {!searchLoading && searchResults && (searchResults.categories.length > 0 || searchResults.products.length > 0) && (
                      <div>
                        {/* Categories */}
                        {searchResults.categories.length > 0 && (
                          <div className="px-3 pt-3 pb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-2">Categories</p>
                            <div className="flex flex-wrap gap-1.5">
                              {searchResults.categories.map((cat) => (
                                <Link
                                  key={cat.id}
                                  href={`/products?categoryId=${cat.id}`}
                                  onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults(null); }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 text-sm font-medium text-gray-700 hover:text-amber-700 transition-colors"
                                >
                                  {cat.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Divider */}
                        {searchResults.categories.length > 0 && searchResults.products.length > 0 && (
                          <div className="mx-3 h-px bg-gray-100" />
                        )}

                        {/* Products */}
                        {searchResults.products.length > 0 && (
                          <div className="p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1.5">
                              Products ({searchResults.totalProducts})
                            </p>
                            {searchResults.products.map((product) => (
                              <Link
                                key={product.id}
                                href={product.variantId ? `/products/${product.slug}?variant=${product.variantId}` : `/products/${product.slug}`}
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults(null); }}
                                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                              >
                                {/* Image */}
                                <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                  {product.image ? (
                                    <ProductImage src={product.image.url} alt={product.image.altText || product.name} width={44} height={44} className="object-cover w-full h-full" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-4 w-4 text-gray-300" /></div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-gray-900">{product.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {product.categoryName && <span className="text-[10px] text-gray-400">{product.categoryName}</span>}
                                    <span className={cn("text-[10px] font-medium", product.inStock ? "text-green-600" : "text-red-500")}>
                                      {product.inStock ? "In Stock" : "Out of Stock"}
                                    </span>
                                  </div>
                                </div>
                                {/* Price */}
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                                    <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
                                  )}
                                </div>
                              </Link>
                            ))}

                            {searchResults.totalProducts > 8 && (
                              <Link
                                href={`/products?search=${encodeURIComponent(searchQuery)}`}
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults(null); }}
                                className="flex items-center justify-center gap-1.5 mt-1 py-2 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                View all {searchResults.totalProducts} results →
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-0.5 ml-auto md:ml-0">
            {/* User */}
            {!loading && (
              <>
                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      aria-label="User menu"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <span className="text-xs font-bold">
                          {(user.name || user.email || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-xs text-gray-700 max-w-[80px] truncate">
                        {(user.name || user.email || "User").split(" ")[0]}
                      </span>
                      <ChevronDown className={cn("hidden sm:block h-3 w-3 text-gray-400 transition-transform", userDropdownOpen && "rotate-180")} />
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                        <div className="border-b border-gray-100 px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className="p-1.5">
                          <Link href="/account" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <User className="h-4 w-4" /> My Account
                          </Link>
                          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <LogOut className="h-4 w-4" /> Log Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openAuthModal("login")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    aria-label="Sign in"
                  >
                    <UserCircle className="h-[18px] w-[18px]" />
                  </button>
                )}
              </>
            )}

            {loading && (
              <div className="flex h-9 w-9 items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse" />
              </div>
            )}

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="h-[18px] w-[18px]" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b45309] px-0.5 text-[9px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b45309] px-0.5 text-[9px] font-bold text-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className={cn(
        "overflow-hidden border-b border-gray-200 bg-white transition-all duration-200 md:hidden",
        mobileMenuOpen ? "max-h-96" : "max-h-0 border-b-0"
      )}>
        <div className="px-4 py-2">
          <form onSubmit={handleSearchSubmit} className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
            />
          </form>
        </div>
        <nav className="flex flex-col gap-0.5 px-3 pb-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                isActive(link.href) ? "bg-amber-50 text-[#b45309]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        totalItems={totalItems}
        totalPrice={totalPrice}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
      />
    </>
  );
}
