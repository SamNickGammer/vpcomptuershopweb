import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productVariants,
  categories,
} from "@/lib/db/schema";
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
        orderByClause = asc(products.createdAt); // will sort in JS after joining variants
        break;
      case "price_desc":
        orderByClause = desc(products.createdAt);
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
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        condition: products.condition,
        categoryId: products.categoryId,
        categoryName: categories.name,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get variant info for these products
    const productIds = productRows.map((p) => p.id);

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          products: [],
          pagination: { page, limit, total, totalPages: 0 },
        },
      });
    }

    // Fetch all active variants for these products
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

    // Group variants by product
    const variantsByProduct = new Map<
      string,
      (typeof variants)[number][]
    >();
    for (const v of variants) {
      const arr = variantsByProduct.get(v.productId) || [];
      arr.push(v);
      variantsByProduct.set(v.productId, arr);
    }

    // Build response
    const productsData = productRows.map((p) => {
      const pvs = variantsByProduct.get(p.id) || [];
      const defaultVariant = pvs.find((v) => v.isDefault) || pvs[0];
      const prices = pvs.map((v) => v.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      const images = defaultVariant?.images as Array<{ url: string; altText?: string }> | undefined;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        condition: p.condition,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        isFeatured: p.isFeatured,
        defaultVariant: defaultVariant
          ? {
              price: defaultVariant.price,
              compareAtPrice: defaultVariant.compareAtPrice,
              image: images?.[0] ?? null,
              inStock: defaultVariant.stock > 0,
            }
          : null,
        variantsCount: pvs.length,
        priceRange: { min: minPrice, max: maxPrice },
      };
    });

    // Sort by price if needed (since we couldn't do it in SQL easily with variants)
    if (sort === "price_asc") {
      productsData.sort(
        (a, b) => (a.priceRange.min || 0) - (b.priceRange.min || 0)
      );
    } else if (sort === "price_desc") {
      productsData.sort(
        (a, b) => (b.priceRange.min || 0) - (a.priceRange.min || 0)
      );
    }

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
