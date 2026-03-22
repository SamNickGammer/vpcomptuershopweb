import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import type { ProductVariantData } from "@/lib/db/schema/products";

// A single storefront listing — one per variant (or one per product if no variants)
type ProductListing = {
  id: string; // unique listing id: `${productId}` or `${productId}__${variantId}`
  productId: string;
  variantId: string | null;
  name: string; // displayName for variants, product.name for base
  slug: string;
  description: string | null;
  condition: "new" | "refurbished" | "used";
  categoryName: string | null;
  price: number;
  compareAtPrice: number | null;
  image: { url: string; altText?: string } | null;
  stock: number;
  inStock: boolean;
  label: string | null;
  isFeatured: boolean;
  createdAt: Date;
};

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

    // Build WHERE conditions
    const conditions = [eq(products.isActive, true)];

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    if (condition && ["new", "refurbished", "used"].includes(condition)) {
      conditions.push(eq(products.condition, condition as "new" | "refurbished" | "used"));
    }
    if (featured === "true") {
      conditions.push(eq(products.isFeatured, true));
    }

    // Search: match product name, description, SKU, variant data, OR category name
    if (search) {
      // First find categories matching the search term
      const matchingCats = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.isActive, true), ilike(categories.name, `%${search}%`)));
      const catIds = matchingCats.map((c) => c.id);

      const searchOr = [
        ilike(products.name, `%${search}%`),
        ilike(products.description, `%${search}%`),
        sql`${products.variants}::text ILIKE ${"%" + search + "%"}`,
      ];

      // Also include products in matching categories
      if (catIds.length > 0) {
        searchOr.push(sql`${products.categoryId} IN ${catIds}`);
      }

      conditions.push(or(...searchOr)!);
    }

    const whereClause = and(...conditions);

    // Get ALL matching products (we need to explode variants before paginating)
    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt));

    // ── Explode: each variant becomes a separate listing ──────────────────
    const allListings: ProductListing[] = [];

    for (const row of productRows) {
      const p = row.product;
      const variantsArr = (p.variants ?? []) as ProductVariantData[];
      const activeVariants = variantsArr.filter((v) => v.isActive !== false);

      if (activeVariants.length > 0) {
        // Create one listing per active variant
        for (const v of activeVariants) {
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
            name: v.displayName || `${p.name} ${v.name}`,
            slug: p.slug,
            description: v.description || p.description,
            condition: p.condition,
            categoryName: row.categoryName,
            price: v.price,
            compareAtPrice: v.compareAtPrice ?? null,
            image,
            stock: v.stock,
            inStock: v.stock > 0,
            label: v.label || null,
            isFeatured: p.isFeatured,
            createdAt: p.createdAt,
          });
        }
      } else {
        // No variants — single listing from base product fields
        const image =
          p.images && p.images.length > 0 ? p.images[0] : null;

        allListings.push({
          id: p.id,
          productId: p.id,
          variantId: null,
          name: p.name,
          slug: p.slug,
          description: p.description,
          condition: p.condition,
          categoryName: row.categoryName,
          price: p.basePrice,
          compareAtPrice: p.compareAtPrice ?? null,
          image,
          stock: p.stock,
          inStock: p.stock > 0,
          label: null,
          isFeatured: p.isFeatured,
          createdAt: p.createdAt,
        });
      }
    }

    // ── Filter by search at variant-listing level ─────────────────────────
    let filteredListings = allListings;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredListings = allListings.filter(
        (l) =>
          l.name.toLowerCase().includes(searchLower) ||
          (l.description && l.description.toLowerCase().includes(searchLower))
      );
    }

    // ── Sort listings ────────────────────────────────────────────────────
    switch (sort) {
      case "price_asc":
        filteredListings.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        filteredListings.sort((a, b) => b.price - a.price);
        break;
      case "newest":
      default:
        filteredListings.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    // ── Paginate over listings (not products) ─────────────────────────────
    const total = filteredListings.length;
    const offset = (page - 1) * limit;
    const paginatedListings = filteredListings.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        products: paginatedListings,
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
