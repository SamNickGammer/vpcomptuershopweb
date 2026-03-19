import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryHistory,
  productVariants,
  products,
} from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

const updateStockSchema = z.object({
  variantId: z.string().min(1),
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

    const whereClause = lowStock
      ? sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`
      : undefined;

    const rows = await db
      .select({
        variant: productVariants,
        productId: products.id,
        productName: products.name,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(whereClause);

    const data = rows.map((row) => ({
      id: row.variant.id,
      name: row.variant.name,
      sku: row.variant.sku,
      price: row.variant.price,
      stock: row.variant.stock,
      lowStockThreshold: row.variant.lowStockThreshold,
      isDefault: row.variant.isDefault,
      isActive: row.variant.isActive,
      status:
        row.variant.stock <= 0
          ? "out_of_stock"
          : row.variant.stock <= row.variant.lowStockThreshold
            ? "low_stock"
            : "in_stock",
      product: {
        id: row.productId,
        name: row.productName,
      },
    }));

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

    const { variantId, changeQuantity, reason, note } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // Find variant
      const [existing] = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);

      if (!existing) {
        return null;
      }

      const newStock = existing.stock + changeQuantity;

      // Update stock on variant
      const [updated] = await tx
        .update(productVariants)
        .set({
          stock: newStock,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, variantId))
        .returning();

      // Insert history record
      await tx.insert(inventoryHistory).values({
        variantId,
        changeQuantity,
        reason,
        note: note ?? null,
      });

      return updated;
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Variant not found" },
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
