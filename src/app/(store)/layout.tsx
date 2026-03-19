"use client";

import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import AuthModal from "@/components/store/AuthModal";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "sonner";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <AuthModal />
      <Toaster theme="dark" position="top-right" richColors />
    </AuthProvider>
  );
}
