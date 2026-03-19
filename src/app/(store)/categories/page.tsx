"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { FolderTree, Loader2, ArrowRight, Package } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  productCount?: number;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build hierarchy: top-level categories with their children
  const topLevel = categories.filter((c) => !c.parentId);
  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.08) 0%, transparent 70%)"
        }} />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-clip-text text-transparent" style={{
              backgroundImage: "linear-gradient(to right, #fafafa, #a1a1aa)"
            }}>
              All Categories
            </span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Browse our complete range of computer hardware and accessories
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-secondary rounded w-2/3" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-4 bg-secondary rounded w-full" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="p-4 rounded-2xl bg-secondary">
                <FolderTree className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground">No categories available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topLevel.map((category) => {
                const children = getChildren(category.id);
                return (
                  <Link
                    key={category.id}
                    href={`/products?categoryId=${category.id}`}
                    className="group block"
                  >
                    <div className="bg-card rounded-2xl border border-border p-6 hover:border-indigo-500/30 transition-all duration-300 h-full">
                      {/* Top: Image + Name */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/[0.06] overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-indigo-500/20 transition-colors">
                          {category.imageUrl ? (
                            <ProductImage
                              src={category.imageUrl}
                              alt={category.name}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <FolderTree className="h-7 w-7 text-indigo-400/40 group-hover:text-indigo-400/60 transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-semibold text-foreground group-hover:text-indigo-300 transition-colors">
                            {category.name}
                          </h2>
                          {category.productCount !== undefined && (
                            <p className="text-sm text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
                              <Package className="h-3.5 w-3.5" />
                              {category.productCount} product{category.productCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                      </div>

                      {/* Description */}
                      {category.description && (
                        <p className="text-sm text-muted-foreground/60 line-clamp-2 mb-3">
                          {category.description}
                        </p>
                      )}

                      {/* Sub-categories */}
                      {children.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/50">
                          {children.map((child) => (
                            <span
                              key={child.id}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground/70 bg-white/[0.03] border border-white/[0.04]"
                            >
                              {child.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
