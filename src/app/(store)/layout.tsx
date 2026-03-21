"use client";

import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import AuthModal from "@/components/store/AuthModal";
import { AuthProvider } from "@/hooks/useAuth";
import { WishlistProvider } from "@/hooks/useWishlist";
import { Toaster } from "sonner";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <div className="store-theme flex min-h-screen flex-col bg-background text-foreground">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <AuthModal />
        <Toaster theme="light" position="top-right" richColors />
      </WishlistProvider>
    </AuthProvider>
  );
}
