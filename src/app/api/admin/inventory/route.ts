import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryHistory, products } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import type { ProductVariantData } from "@/lib/db/schema/products";

const updateStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(), // optional: which variant's stock changed
  changeQuantity: z.number().int(),
  reason: z.enum(["purchase", "sale", "return", "adjustment", "damage"]),
  note: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lowStock = searchParams.get("lowStock") === "true";

    const rows = await db.select().from(products);

    const data = rows
      .map((p) => {
        const variants = ((p.variants ?? []) as ProductVariantData[]).map(
          (variant) => ({
            variantId: variant.variantId,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            isActive: variant.isActive ?? true,
          })
        );

        const effectiveStock =
          variants.length > 0
            ? variants.reduce((sum, variant) => sum + variant.stock, 0)
            : p.stock;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          basePrice: p.basePrice,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          isActive: p.isActive,
          status:
            effectiveStock <= 0
              ? "out_of_stock"
              : effectiveStock <= p.lowStockThreshold
                ? "low_stock"
                : "in_stock",
          variants,
          variantsCount: variants.length,
        };
      })
      .filter((product) => {
        if (!lowStock) {
          return true;
        }

        if (product.variants.length > 0) {
          return product.variants.some(
            (variant) =>
              variant.stock > 0 &&
              variant.stock <= product.lowStockThreshold
          );
        }

        return product.stock > 0 && product.stock <= product.lowStockThreshold;
      });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/admin/inventory error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch inventory",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = updateStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const { productId, variantId, changeQuantity, reason, note } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // Find product
      const [existing] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!existing) {
        return null;
      }

      const existingVariants = (existing.variants ?? []) as ProductVariantData[];
      const hasVariants = existingVariants.length > 0;
      const shouldUpdateVariant = Boolean(variantId) && hasVariants;

      let nextVariants = existingVariants;
      let newStock = existing.stock + changeQuantity;

      if (shouldUpdateVariant) {
        let foundVariant = false;

        nextVariants = existingVariants.map((variant) => {
          if (variant.variantId !== variantId) {
            return variant;
          }

          foundVariant = true;
          return {
            ...variant,
            stock: variant.stock + changeQuantity,
          };
        });

        if (!foundVariant) {
          return null;
        }

        newStock = nextVariants.reduce(
          (sum, variant) => sum + Math.max(variant.stock, 0),
          0
        );
      }

      // Update stock on product
      const [updated] = await tx
        .update(products)
        .set({
          stock: newStock,
          variants: nextVariants,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      // Insert history record
      await tx.insert(inventoryHistory).values({
        productId,
        variantId: variantId ?? null,
        changeQuantity,
        reason,
        note: note ?? null,
      });

      return updated;
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("PUT /api/admin/inventory error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update inventory",
      },
      { status: 500 }
    );
  }
}
