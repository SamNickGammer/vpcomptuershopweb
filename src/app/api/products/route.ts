import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and, ilike, sql, asc, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const condition = searchParams.get("condition");
    const featured = searchParams.get("featured");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") || "newest";
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [eq(products.isActive, true)];

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    if (condition && ["new", "refurbished", "used"].includes(condition)) {
      conditions.push(eq(products.condition, condition as "new" | "refurbished" | "used"));
    }
    if (featured === "true") {
      conditions.push(eq(products.isFeatured, true));
    }

    const whereClause = and(...conditions);

    // Determine sort order
    let orderByClause;
    switch (sort) {
      case "price_asc":
        orderByClause = asc(products.basePrice);
        break;
      case "price_desc":
        orderByClause = desc(products.basePrice);
        break;
      case "newest":
      default:
        orderByClause = desc(products.createdAt);
        break;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Get products with category name
    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Build response
    const productsData = productRows.map((row) => {
      const p = row.product;
      const variantsArr = (p.variants ?? []) as Array<{
        variantId: string;
        name: string;
        price: number;
        compareAtPrice?: number | null;
        stock: number;
        images: Array<{ url: string; altText?: string }>;
        isDefault?: boolean;
        isActive?: boolean;
      }>;

      // Filter active variants
      const activeVariants = variantsArr.filter((v) => v.isActive !== false);

      const prices =
        activeVariants.length > 0
          ? activeVariants.map((v) => v.price)
          : [p.basePrice];
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const defaultVariant = activeVariants.find((v) => v.isDefault) ?? activeVariants[0];

      const image =
        p.images && p.images.length > 0
          ? p.images[0]
          : defaultVariant?.images?.[0] ?? null;

      const inStock =
        activeVariants.length > 0
          ? activeVariants.some((v) => v.stock > 0)
          : p.stock > 0;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        condition: p.condition,
        categoryId: p.categoryId,
        categoryName: row.categoryName,
        isFeatured: p.isFeatured,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        image,
        inStock,
        variantsCount: activeVariants.length,
        priceRange: { min: minPrice, max: maxPrice },
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        products: productsData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
