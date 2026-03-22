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

  // Show all categories — group children under parents, but also show children as their own cards
  const topLevel = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);
  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);
  const getParentName = (parentId: string | null) =>
    parentId ? categories.find((c) => c.id === parentId)?.name : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="relative py-16 md:py-24 bg-gray-50">
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-gray-900">
            All Categories
          </h1>
          <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
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
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="p-4 rounded-2xl bg-gray-100">
                <FolderTree className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500">No categories available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const children = getChildren(category.id);
                const parentName = getParentName(category.parentId);
                return (
                  <Link
                    key={category.id}
                    href={`/products?categoryId=${category.id}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 h-full overflow-hidden">
                      {/* Image */}
                      <div className="aspect-[4/3] bg-gray-50 overflow-hidden relative">
                        {category.imageUrl ? (
                          <>
                            <ProductImage
                              src={category.imageUrl}
                              alt={category.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderTree className="h-10 w-10 text-gray-300 group-hover:text-amber-400 transition-colors" />
                          </div>
                        )}
                        {/* Parent badge */}
                        {parentName && (
                          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-medium text-gray-600 px-2 py-0.5 rounded-md">
                            {parentName}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3.5">
                        <h2 className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors mb-1">
                          {category.name}
                        </h2>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {category.productCount ?? 0} product{(category.productCount ?? 0) !== 1 ? "s" : ""}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
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
