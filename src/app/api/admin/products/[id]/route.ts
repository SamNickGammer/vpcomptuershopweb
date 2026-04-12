import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { slugify } from "@/lib/utils/helpers";
import { normalizeBulkPricingTiers } from "@/lib/pricing";

const bulkPricingTierSchema = z.object({
  minQuantity: z.number().int().min(2),
  unitPrice: z.number().int().min(0),
  freeShipping: z.boolean().optional().default(false),
  label: z.string().max(120).optional().default(""),
});

const variantSchema = z.object({
  variantId: z.string().min(1),
  name: z.string().min(1).max(255),
  displayName: z.string().max(500).optional().default(""),
  label: z.string().max(255).optional().default(""),
  description: z.string().optional().default(""),
  sku: z.string().min(1).max(100),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  images: z
    .array(z.object({ url: z.string().min(1), altText: z.string().optional() }))
    .optional()
    .default([]),
  specs: z
    .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
    .optional()
    .default([]),
  bulkPricing: z.array(bulkPricingTierSchema).optional().default([]),
  stock: z.number().int().min(0).default(0),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  condition: z.enum(["new", "refurbished", "used"]).optional(),
  sku: z.string().max(100).optional().nullable(),
  basePrice: z.number().int().min(0).optional(),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  images: z
    .array(z.object({ url: z.string().min(1), altText: z.string().optional() }))
    .optional(),
  specs: z
    .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
    .optional(),
  bulkPricing: z.array(bulkPricingTierSchema).optional(),
  shippingWeightGrams: z.number().int().min(0).optional(),
  shippingDimensions: z
    .object({
      lengthCm: z.number().min(0),
      breadthCm: z.number().min(0),
      heightCm: z.number().min(0),
    })
    .optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  variants: z.array(variantSchema).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("GET /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    // Check product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const {
      name,
      description,
      categoryId,
      condition,
      sku,
      basePrice,
      compareAtPrice,
      images,
      specs,
      bulkPricing,
      shippingWeightGrams,
      shippingDimensions,
      stock,
      lowStockThreshold,
      variants,
      isFeatured,
      isActive,
    } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
      let slug = slugify(name);
      const existingSlugs = await db
        .select({ id: products.id, slug: products.slug })
        .from(products);
      const slugMap = new Map(existingSlugs.map((e) => [e.slug, e.id]));
      let suffix = 1;
      while (slugMap.has(slug) && slugMap.get(slug) !== id) {
        suffix++;
        slug = `${slugify(name)}-${suffix}`;
      }
      updateData.slug = slug;
    }

    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (condition !== undefined) updateData.condition = condition;
    if (sku !== undefined) updateData.sku = sku;
    if (basePrice !== undefined) updateData.basePrice = basePrice;
    if (compareAtPrice !== undefined) updateData.compareAtPrice = compareAtPrice;
    if (images !== undefined) updateData.images = images;
    if (specs !== undefined) updateData.specs = specs;
    if (bulkPricing !== undefined) {
      updateData.bulkPricing = normalizeBulkPricingTiers(bulkPricing);
    }
    if (shippingWeightGrams !== undefined) {
      updateData.shippingWeightGrams = shippingWeightGrams;
    }
    if (shippingDimensions !== undefined) {
      updateData.shippingDimensions = shippingDimensions;
    }
    if (stock !== undefined) updateData.stock = stock;
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = lowStockThreshold;
    if (variants !== undefined) {
      const productName = (name ?? existing.name) as string;
      updateData.variants = variants.map((v) => ({
        ...v,
        displayName: v.displayName || `${productName} ${v.name}`.trim(),
        bulkPricing: normalizeBulkPricingTiers(v.bulkPricing),
      }));
    }
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Cascade delete handles inventory_history (onDelete cascade on productId)
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product",
      },
      { status: 500 }
    );
  }
}
