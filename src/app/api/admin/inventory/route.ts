import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryHistory, products } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

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

    const whereClause = lowStock
      ? sql`${products.stock} <= ${products.lowStockThreshold}`
      : undefined;

    const rows = await db
      .select()
      .from(products)
      .where(whereClause);

    const data = rows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      basePrice: p.basePrice,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      isActive: p.isActive,
      status:
        p.stock <= 0
          ? "out_of_stock"
          : p.stock <= p.lowStockThreshold
            ? "low_stock"
            : "in_stock",
      variantsCount: ((p.variants ?? []) as unknown[]).length,
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

      const newStock = existing.stock + changeQuantity;

      // Update stock on product
      const [updated] = await tx
        .update(products)
        .set({
          stock: newStock,
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
