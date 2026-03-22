import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import type { ProductVariantData } from "@/lib/db/schema/products";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({
        success: true,
        data: { categories: [], products: [], totalProducts: 0 },
      });
    }

    const searchPattern = `%${q}%`;

    // 1. Find matching categories
    const matchedCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageUrl: categories.imageUrl,
      })
      .from(categories)
      .where(and(eq(categories.isActive, true), ilike(categories.name, searchPattern)))
      .limit(4);

    // Collect matched category IDs for product lookup
    const matchedCategoryIds = matchedCategories.map((c) => c.id);

    // 2. Find products matching: name, description, variant data, SKU, OR belonging to matched categories
    const productConditions = [eq(products.isActive, true)];

    const searchOr = [
      ilike(products.name, searchPattern),
      ilike(products.description, searchPattern),
      sql`${products.variants}::text ILIKE ${searchPattern}`,
      ilike(products.sku, searchPattern),
    ];

    // Also match products in categories that match the search term
    if (matchedCategoryIds.length > 0) {
      searchOr.push(
        sql`${products.categoryId} IN ${matchedCategoryIds}`
      );
    }

    productConditions.push(or(...searchOr)!);

    const productResults = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...productConditions))
      .limit(30);

    // Explode variants into individual listings
    type SearchListing = {
      id: string;
      productId: string;
      variantId: string | null;
      name: string;
      slug: string;
      condition: "new" | "refurbished" | "used";
      categoryName: string | null;
      price: number;
      compareAtPrice: number | null;
      image: { url: string; altText?: string } | null;
      inStock: boolean;
      label: string | null;
    };

    const allListings: SearchListing[] = [];

    for (const row of productResults) {
      const p = row.product;
      const catName = row.categoryName;
      const variantsArr = (p.variants ?? []) as ProductVariantData[];
      const activeVariants = variantsArr.filter((v) => v.isActive !== false);

      if (activeVariants.length > 0) {
        for (const v of activeVariants) {
          const displayName = v.displayName || `${p.name} ${v.name}`;
          const image =
            v.images?.length > 0 ? v.images[0] :
            (p.images as Array<{url: string; altText?: string}>)?.length > 0 ? (p.images as Array<{url: string; altText?: string}>)[0] :
            null;

          allListings.push({
            id: `${p.id}__${v.variantId}`,
            productId: p.id,
            variantId: v.variantId,
            name: displayName,
            slug: p.slug,
            condition: p.condition,
            categoryName: catName,
            price: v.price,
            compareAtPrice: v.compareAtPrice ?? null,
            image,
            inStock: v.stock > 0,
            label: v.label || null,
          });
        }
      } else {
        const imgs = p.images as Array<{url: string; altText?: string}> | null;
        allListings.push({
          id: p.id,
          productId: p.id,
          variantId: null,
          name: p.name,
          slug: p.slug,
          condition: p.condition,
          categoryName: catName,
          price: p.basePrice,
          compareAtPrice: p.compareAtPrice ?? null,
          image: imgs?.[0] ?? null,
          inStock: p.stock > 0,
          label: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        categories: matchedCategories,
        products: allListings.slice(0, 8),
        totalProducts: allListings.length,
      },
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}
