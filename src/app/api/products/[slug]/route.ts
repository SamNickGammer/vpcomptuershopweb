import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and, ne, sql, desc } from "drizzle-orm";
import type { ProductVariantData } from "@/lib/db/schema/products";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Check for ?variant=variantId query param
    const url = new URL(request.url);
    const requestedVariantId = url.searchParams.get("variant");

    // Get the product with category
    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);

    if (productRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const row = productRows[0];
    const p = row.product;

    // Filter active variants from JSONB
    const allVariants = (p.variants ?? []) as ProductVariantData[];

    const activeVariants = allVariants
      .filter((v) => v.isActive !== false)
      .map((v) => ({
        ...v,
        inStock: v.stock > 0,
      }));

    // Determine which variant should be pre-selected
    let selectedVariantId: string | null = null;
    if (activeVariants.length > 0) {
      if (
        requestedVariantId &&
        activeVariants.some((v) => v.variantId === requestedVariantId)
      ) {
        selectedVariantId = requestedVariantId;
      } else {
        const defaultVariant =
          activeVariants.find((v) => v.isDefault) ?? activeVariants[0];
        selectedVariantId = defaultVariant.variantId;
      }
    }

    // ── Fetch similar products ─────────────────────────────────────────────
    // Priority: 1) same category, 2) similar name keywords
    let similarProducts: Array<{
      id: string;
      name: string;
      slug: string;
      condition: string;
      price: number;
      compareAtPrice: number | null;
      image: { url: string; altText?: string } | null;
      inStock: boolean;
      categoryName: string | null;
    }> = [];

    try {
      // Get products from same category (excluding current product)
      const similarRows = p.categoryId
        ? await db
            .select({
              product: products,
              categoryName: categories.name,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(
              and(
                eq(products.isActive, true),
                eq(products.categoryId, p.categoryId),
                ne(products.id, p.id)
              )
            )
            .orderBy(desc(products.isFeatured), desc(products.createdAt))
            .limit(8)
        : [];

      // If not enough from same category, also fetch by name similarity
      if (similarRows.length < 5) {
        const nameWords = p.name
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 2);
        if (nameWords.length > 0) {
          const existingIds = new Set([p.id, ...similarRows.map((r) => r.product.id)]);
          for (const word of nameWords) {
            if (similarRows.length >= 8) break;
            const more = await db
              .select({ product: products, categoryName: categories.name })
              .from(products)
              .leftJoin(categories, eq(products.categoryId, categories.id))
              .where(
                and(
                  eq(products.isActive, true),
                  sql`${products.name} ILIKE ${"%" + word + "%"}`
                )
              )
              .limit(5);
            for (const r of more) {
              if (!existingIds.has(r.product.id) && similarRows.length < 8) {
                existingIds.add(r.product.id);
                similarRows.push(r);
              }
            }
          }
        }
      }

      // Map to response shape — explode variants
      for (const row of similarRows) {
        const sp = row.product;
        const vars = (sp.variants ?? []) as ProductVariantData[];
        const activeVars = vars.filter((v) => v.isActive !== false);

        if (activeVars.length > 0) {
          // Just show first active variant
          const v = activeVars.find((vv) => vv.isDefault) || activeVars[0];
          const img = v.images?.[0] || (sp.images as Array<{url:string;altText?:string}>)?.[0] || null;
          similarProducts.push({
            id: sp.id,
            name: v.displayName || `${sp.name} ${v.name}`,
            slug: sp.slug,
            condition: sp.condition,
            price: v.price,
            compareAtPrice: v.compareAtPrice ?? null,
            image: img,
            inStock: v.stock > 0,
            categoryName: row.categoryName,
          });
        } else {
          const imgs = sp.images as Array<{url:string;altText?:string}> | null;
          similarProducts.push({
            id: sp.id,
            name: sp.name,
            slug: sp.slug,
            condition: sp.condition,
            price: sp.basePrice,
            compareAtPrice: sp.compareAtPrice ?? null,
            image: imgs?.[0] ?? null,
            inStock: sp.stock > 0,
            categoryName: row.categoryName,
          });
        }
      }

      similarProducts = similarProducts.slice(0, 5);
    } catch (e) {
      console.error("Similar products error:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        condition: p.condition,
        sku: p.sku,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        images: p.images,
        specs: p.specs,
        stock: p.stock,
        inStock: p.stock > 0 || activeVariants.some((v) => v.stock > 0),
        category: p.categoryId
          ? {
              id: p.categoryId,
              name: row.categoryName,
              slug: row.categorySlug,
            }
          : null,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        variants: activeVariants,
        selectedVariantId,
        similarProducts,
      },
    });
  } catch (error) {
    console.error("GET /api/products/[slug] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
