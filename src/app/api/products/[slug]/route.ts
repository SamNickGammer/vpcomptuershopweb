import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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
    const allVariants = (p.variants ?? []) as Array<{
      variantId: string;
      name: string;
      sku: string;
      price: number;
      compareAtPrice?: number | null;
      images: Array<{ url: string; altText?: string }>;
      specs: Array<{ key: string; value: string }>;
      stock: number;
      isDefault?: boolean;
      isActive?: boolean;
    }>;

    const activeVariants = allVariants
      .filter((v) => v.isActive !== false)
      .map((v) => ({
        ...v,
        inStock: v.stock > 0,
      }));

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
