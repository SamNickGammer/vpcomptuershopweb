import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";

export async function GET() {
  try {
    // Get all active categories
    const categoryRows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    // Get product counts per category (only active products)
    const productCounts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.categoryId);

    const countMap = new Map<string, number>();
    for (const row of productCounts) {
      if (row.categoryId) {
        countMap.set(row.categoryId, row.count);
      }
    }

    const categoriesData = categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      parentId: c.parentId,
      productCount: countMap.get(c.id) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: categoriesData,
    });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
