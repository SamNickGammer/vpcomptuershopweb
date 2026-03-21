import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

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

      // Products query — no joins needed, everything is on the products table
      db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(
              ilike(products.name, searchPattern),
              ilike(products.description, searchPattern)
            )
          )
        )
        .limit(10),
    ]);

    // Build product results
    const searchProducts = productResults.map((p) => {
      const image =
        p.images && p.images.length > 0 ? p.images[0] : null;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        condition: p.condition,
        price: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        image,
        inStock: p.stock > 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        categories: matchedCategories,
        products: searchProducts.slice(0, 6),
        totalProducts: searchProducts.length,
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
