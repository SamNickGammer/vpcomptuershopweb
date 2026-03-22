"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { FolderTree, Loader2, Package } from "lucide-react";

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

  const getParentName = (parentId: string | null) =>
    parentId ? categories.find((c) => c.id === parentId)?.name : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">All Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {categories.length} categories available
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <FolderTree className="h-10 w-10 text-gray-300" />
            <p className="text-gray-400">No categories yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {categories.map((category) => {
              const parentName = getParentName(category.parentId);
              return (
                <Link
                  key={category.id}
                  href={`/products?categoryId=${category.id}`}
                  className="group text-center"
                >
                  {/* Circular image */}
                  <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-amber-500 group-hover:shadow-lg transition-all duration-200">
                    {category.imageUrl ? (
                      <ProductImage
                        src={category.imageUrl}
                        alt={category.name}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FolderTree className="h-7 w-7 text-gray-400 group-hover:text-amber-600 transition-colors" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p className="mt-3 text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-tight">
                    {category.name}
                  </p>

                  {/* Product count */}
                  <p className="text-[11px] text-gray-500 mt-1">
                    {category.productCount ?? 0} items
                  </p>

                  {/* Parent indicator */}
                  {parentName && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      in {parentName}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
