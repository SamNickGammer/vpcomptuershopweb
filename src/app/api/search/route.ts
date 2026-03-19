import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productVariants,
  categories,
} from "@/lib/db/schema";
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

    // Search categories (max 4)
    const matchedCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageUrl: categories.imageUrl,
      })
      .from(categories)
      .where(
        and(eq(categories.isActive, true), ilike(categories.name, searchPattern))
      )
      .limit(4);

    // Search products (match by name or description), only active
    const productCondition = and(
      eq(products.isActive, true),
      or(
        ilike(products.name, searchPattern),
        ilike(products.description, searchPattern)
      )
    );

    // Total count of matching products
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(productCondition);

    const totalProducts = countResult[0]?.count ?? 0;

    // Get top 6 matching products
    const matchedProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        condition: products.condition,
      })
      .from(products)
      .where(productCondition)
      .limit(6);

    // Get default variant info for matched products
    const productIds = matchedProducts.map((p) => p.id);

    const variantMap = new Map<
      string,
      {
        price: number;
        compareAtPrice: number | null;
        image: { url: string; altText?: string } | null;
        inStock: boolean;
      }
    >();

    if (productIds.length > 0) {
      const variants = await db
        .select({
          productId: productVariants.productId,
          price: productVariants.price,
          compareAtPrice: productVariants.compareAtPrice,
          images: productVariants.images,
          stock: productVariants.stock,
          isDefault: productVariants.isDefault,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.isActive, true),
            sql`${productVariants.productId} IN ${productIds}`
          )
        );

      // Group by product, prefer default variant
      const grouped = new Map<string, (typeof variants)[number][]>();
      for (const v of variants) {
        const arr = grouped.get(v.productId) || [];
        arr.push(v);
        grouped.set(v.productId, arr);
      }

      for (const [pid, pvs] of grouped) {
        const defaultV = pvs.find((v) => v.isDefault) || pvs[0];
        if (defaultV) {
          const images = defaultV.images as
            | Array<{ url: string; altText?: string }>
            | undefined;
          variantMap.set(pid, {
            price: defaultV.price,
            compareAtPrice: defaultV.compareAtPrice,
            image: images?.[0] ?? null,
            inStock: defaultV.stock > 0,
          });
        }
      }
    }

    const productsData = matchedProducts.map((p) => {
      const v = variantMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        condition: p.condition,
        price: v?.price ?? null,
        compareAtPrice: v?.compareAtPrice ?? null,
        image: v?.image ?? null,
        inStock: v?.inStock ?? false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        categories: matchedCategories,
        products: productsData,
        totalProducts,
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
