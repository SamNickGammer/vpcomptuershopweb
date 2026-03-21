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

    // Run categories and products queries in parallel
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

      // Products query — match product name, description, OR variant data (displayNames)
      db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(
              ilike(products.name, searchPattern),
              ilike(products.description, searchPattern),
              sql`${products.variants}::text ILIKE ${searchPattern}`
            )
          )
        )
        .limit(20),
    ]);

    // Explode variants into individual search result listings
    type SearchListing = {
      id: string;
      productId: string;
      variantId: string | null;
      name: string;
      slug: string;
      condition: "new" | "refurbished" | "used";
      price: number;
      compareAtPrice: number | null;
      image: { url: string; altText?: string } | null;
      inStock: boolean;
      label: string | null;
    };

    const allListings: SearchListing[] = [];
    const qLower = q.toLowerCase();

    for (const p of productResults) {
      const variantsArr = (p.variants ?? []) as ProductVariantData[];
      const activeVariants = variantsArr.filter((v) => v.isActive !== false);

      if (activeVariants.length > 0) {
        for (const v of activeVariants) {
          const displayName = v.displayName || `${p.name} ${v.name}`;
          // Check if this specific variant or the parent product matches the query
          const matches =
            p.name.toLowerCase().includes(qLower) ||
            displayName.toLowerCase().includes(qLower) ||
            v.name.toLowerCase().includes(qLower) ||
            (v.description && v.description.toLowerCase().includes(qLower)) ||
            (p.description && p.description.toLowerCase().includes(qLower));

          if (matches) {
            const image =
              v.images && v.images.length > 0
                ? v.images[0]
                : p.images && p.images.length > 0
                  ? p.images[0]
                  : null;

            allListings.push({
              id: `${p.id}__${v.variantId}`,
              productId: p.id,
              variantId: v.variantId,
              name: displayName,
              slug: p.slug,
              condition: p.condition,
              price: v.price,
              compareAtPrice: v.compareAtPrice ?? null,
              image,
              inStock: v.stock > 0,
              label: v.label || null,
            });
          }
        }
      } else {
        const image =
          p.images && p.images.length > 0 ? p.images[0] : null;

        allListings.push({
          id: p.id,
          productId: p.id,
          variantId: null,
          name: p.name,
          slug: p.slug,
          condition: p.condition,
          price: p.basePrice,
          compareAtPrice: p.compareAtPrice ?? null,
          image,
          inStock: p.stock > 0,
          label: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        categories: matchedCategories,
        products: allListings.slice(0, 6),
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
