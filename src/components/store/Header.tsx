"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  UserCircle,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Search,
  Grid3X3,
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
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  function handleLogout() {
    setUserDropdownOpen(false);
    logout();
  }

  return (
    <>
      {/* ── Row 1: Main Header (sticky) ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e5e7eb] shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2">
            <Image
              src="/logo/LOGO_v&P.svg"
              alt="V&P Computer"
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
              unoptimized
            />
          </Link>

          {/* Search Bar (center, hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type="text"
                placeholder="Search for laptops, processors, RAM, motherboards..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#e5e7eb] bg-white text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d97706]/40 focus:border-[#d97706] transition-all text-sm"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* User Button / Dropdown */}
            {!loading && (
              <>
                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                      aria-label="User menu"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d97706]/15 text-[#d97706]">
                        <span className="text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden text-[#1a1a1a] sm:inline max-w-[100px] truncate">
                        {user.name.split(" ")[0]}
                      </span>
                      <ChevronDown
                        className={cn(
                          "hidden h-3.5 w-3.5 transition-transform sm:block",
                          userDropdownOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Dropdown */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-[#e5e7eb] bg-white shadow-xl z-50">
                        <div className="border-b border-[#e5e7eb] px-4 py-3">
                          <p className="text-sm font-medium text-[#1a1a1a] truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-[#6b7280] truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                          >
                            <User className="h-4 w-4" />
                            My Account
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                          >
                            <LogOut className="h-4 w-4" />
                            Log Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openAuthModal("login")}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                    aria-label="Sign in"
                  >
                    <UserCircle className="h-5 w-5" />
                  </button>
                )}
              </>
            )}

            {/* Loading placeholder */}
            {loading && (
              <div className="flex h-10 w-10 items-center justify-center">
                <div className="h-5 w-5 rounded-full bg-[#e5e7eb] animate-pulse" />
              </div>
            )}

            {/* Wishlist Button */}
            <Link
              href="/wishlist"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d97706] px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d97706] px-1 text-[10px] font-bold text-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4b5563] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a] md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile search (visible below header on mobile) */}
        <div className="md:hidden border-t border-[#e5e7eb] px-4 py-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full h-9 pl-10 pr-4 rounded-lg border border-[#e5e7eb] bg-white text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#d97706]/40 focus:border-[#d97706] transition-all text-sm"
            />
          </div>
        </div>
      </header>

      {/* ── Row 2: Navigation bar ───────────────────────────────────────────── */}
      <nav className="hidden md:block bg-[#f5f5f5] border-b border-[#e5e7eb]">
        <div className="mx-auto flex max-w-7xl items-center gap-0 px-4 sm:px-6 lg:px-8">
          {/* All Categories button */}
          <Link
            href="/categories"
            className="flex items-center gap-2 bg-[#d97706] text-white font-semibold text-sm px-5 py-2.5 hover:bg-[#b45309] transition-colors"
          >
            <Grid3X3 className="h-4 w-4" />
            All Categories
          </Link>

          {/* Nav links */}
          <div className="flex items-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "text-[#d97706] border-b-2 border-[#d97706]"
                    : "text-[#4b5563] hover:text-[#d97706]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Mobile Nav ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden border-b border-[#e5e7eb] bg-white transition-all duration-200 md:hidden",
          mobileMenuOpen ? "max-h-96" : "max-h-0 border-b-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          <Link
            href="/categories"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg bg-[#d97706] text-white px-4 py-2.5 text-sm font-semibold mb-1"
          >
            <Grid3X3 className="h-4 w-4" />
            All Categories
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-[#FFF3E0] text-[#d97706]"
                  : "text-[#4b5563] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
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
