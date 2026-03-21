import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
