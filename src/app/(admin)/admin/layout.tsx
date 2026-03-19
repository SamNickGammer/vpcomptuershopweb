"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/admin/layout/Sidebar";
import { Header } from "@/components/admin/layout/Header";
import { Toaster } from "sonner";

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/admin/dashboard": { title: "Dashboard", subtitle: "Overview of your store" },
  "/admin/analytics": { title: "Analytics", subtitle: "Store performance metrics" },
  "/admin/products": { title: "Products", subtitle: "Manage your product catalog" },
  "/admin/categories": { title: "Categories", subtitle: "Organize your products" },
  "/admin/orders": { title: "Orders", subtitle: "View and manage orders" },
  "/admin/inventory": { title: "Inventory", subtitle: "Stock management" },
  "/admin/settings": { title: "Settings", subtitle: "Store configuration" },
};

function getPageMeta(pathname: string) {
  // Exact match first
  if (pageMeta[pathname]) return pageMeta[pathname];

  // Prefix match (e.g. /admin/products/new or /admin/orders/123)
  const base = Object.keys(pageMeta).find((key) =>
    pathname.startsWith(key + "/")
  );
  if (base) return pageMeta[base];

  return { title: "Admin", subtitle: undefined };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
