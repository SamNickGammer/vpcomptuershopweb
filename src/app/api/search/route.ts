import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, categories } from "@/lib/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";

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

    // Run categories and products queries IN PARALLEL
    const [matchedCategories, productResults] = await Promise.all([
      // Categories query
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          imageUrl: categories.imageUrl,
        })
        .from(categories)
        .where(
          and(
            eq(categories.isActive, true),
            ilike(categories.name, searchPattern)
          )
        )
        .limit(4),

      // Products + variants in a single query using LEFT JOIN
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          condition: products.condition,
          variantPrice: productVariants.price,
          variantCompareAtPrice: productVariants.compareAtPrice,
          variantImages: productVariants.images,
          variantStock: productVariants.stock,
          variantIsDefault: productVariants.isDefault,
        })
        .from(products)
        .leftJoin(
          productVariants,
          and(
            eq(productVariants.productId, products.id),
            eq(productVariants.isActive, true)
          )
        )
        .where(
          and(
            eq(products.isActive, true),
            or(
              ilike(products.name, searchPattern),
              ilike(products.description, searchPattern)
            )
          )
        ),
    ]);

    // Deduplicate products (multiple variants create multiple rows)
    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        condition: string;
        price: number | null;
        compareAtPrice: number | null;
        image: { url: string; altText?: string } | null;
        inStock: boolean;
      }
    >();

    for (const row of productResults) {
      if (!productMap.has(row.id)) {
        const images = row.variantImages as
          | Array<{ url: string; altText?: string }>
          | null;
        productMap.set(row.id, {
          id: row.id,
          name: row.name,
          slug: row.slug,
          condition: row.condition,
          price: row.variantPrice,
          compareAtPrice: row.variantCompareAtPrice,
          image: images?.[0] ?? null,
          inStock: (row.variantStock ?? 0) > 0,
        });
      } else if (row.variantIsDefault) {
        // Prefer default variant data
        const images = row.variantImages as
          | Array<{ url: string; altText?: string }>
          | null;
        productMap.set(row.id, {
          ...productMap.get(row.id)!,
          price: row.variantPrice,
          compareAtPrice: row.variantCompareAtPrice,
          image: images?.[0] ?? null,
          inStock: (row.variantStock ?? 0) > 0,
        });
      }
    }

    const allProducts = Array.from(productMap.values());

    return NextResponse.json({
      success: true,
      data: {
        categories: matchedCategories,
        products: allProducts.slice(0, 6),
        totalProducts: allProducts.length,
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
