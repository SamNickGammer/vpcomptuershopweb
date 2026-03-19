import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productVariants,
  productOptions,
  productOptionValues,
  variantOptionValues,
  categories,
} from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get the product with category
    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        condition: products.condition,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
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

    const product = productRows[0];

    // Get all active variants
    const variants = await db
      .select({
        id: productVariants.id,
        name: productVariants.name,
        sku: productVariants.sku,
        price: productVariants.price,
        compareAtPrice: productVariants.compareAtPrice,
        images: productVariants.images,
        specs: productVariants.specs,
        stock: productVariants.stock,
        isDefault: productVariants.isDefault,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, product.id),
          eq(productVariants.isActive, true)
        )
      );

    // Get product options with their values
    const options = await db
      .select({
        id: productOptions.id,
        name: productOptions.name,
        position: productOptions.position,
      })
      .from(productOptions)
      .where(eq(productOptions.productId, product.id))
      .orderBy(asc(productOptions.position));

    // Get option values for all options
    const optionIds = options.map((o) => o.id);
    let optionValuesRows: Array<{
      id: string;
      optionId: string;
      value: string;
      position: number;
    }> = [];

    if (optionIds.length > 0) {
      optionValuesRows = await db
        .select({
          id: productOptionValues.id,
          optionId: productOptionValues.optionId,
          value: productOptionValues.value,
          position: productOptionValues.position,
        })
        .from(productOptionValues)
        .where(sql`${productOptionValues.optionId} IN ${optionIds}`)
        .orderBy(asc(productOptionValues.position));
    }

    // Get variant-option-value mappings for all variants
    const variantIds = variants.map((v) => v.id);
    let variantOptionLinks: Array<{
      variantId: string;
      optionValueId: string;
    }> = [];

    if (variantIds.length > 0 && optionIds.length > 0) {
      variantOptionLinks = await db
        .select({
          variantId: variantOptionValues.variantId,
          optionValueId: variantOptionValues.optionValueId,
        })
        .from(variantOptionValues)
        .where(sql`${variantOptionValues.variantId} IN ${variantIds}`);
    }

    // Build variant-to-option-values map
    const variantOptionsMap = new Map<string, string[]>();
    for (const link of variantOptionLinks) {
      const arr = variantOptionsMap.get(link.variantId) || [];
      arr.push(link.optionValueId);
      variantOptionsMap.set(link.variantId, arr);
    }

    // Assemble options with values
    const optionsData = options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      position: opt.position,
      values: optionValuesRows
        .filter((ov) => ov.optionId === opt.id)
        .sort((a, b) => a.position - b.position)
        .map((ov) => ({
          id: ov.id,
          value: ov.value,
          position: ov.position,
        })),
    }));

    // Assemble variants
    const variantsData = variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      images: v.images as Array<{ url: string; altText?: string }>,
      specs: v.specs as Array<{ key: string; value: string }>,
      stock: v.stock,
      inStock: v.stock > 0,
      isDefault: v.isDefault,
      selectedOptions: variantOptionsMap.get(v.id) || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        condition: product.condition,
        category: product.categoryId
          ? {
              id: product.categoryId,
              name: product.categoryName,
              slug: product.categorySlug,
            }
          : null,
        isFeatured: product.isFeatured,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        options: optionsData,
        variants: variantsData,
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
