import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

const updateCouponSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional().nullable(),
  discountType: z.enum(["percentage", "fixed", "pay_amount"]).optional(),
  discountValue: z.number().int().min(1).optional(),
  minOrderAmount: z.number().int().min(0).optional().nullable(),
  maxDiscountAmount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
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

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    console.error("GET /api/admin/coupons/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch coupon";
    return NextResponse.json(
      { success: false, error: message },
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
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    // Check coupon exists
    const [existing] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      validFrom,
      validTo,
      isActive,
    } = parsed.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (code !== undefined) {
      const normalizedCode = code.trim().toUpperCase();
      // Check uniqueness if code is changing
      if (normalizedCode !== existing.code) {
        const [duplicate] = await db
          .select({ id: coupons.id })
          .from(coupons)
          .where(eq(coupons.code, normalizedCode))
          .limit(1);

        if (duplicate) {
          return NextResponse.json(
            { success: false, error: "Coupon code already exists" },
            { status: 409 }
          );
        }
      }
      updateData.code = normalizedCode;
    }
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = discountValue;
    if (minOrderAmount !== undefined)
      updateData.minOrderAmount = minOrderAmount;
    if (maxDiscountAmount !== undefined)
      updateData.maxDiscountAmount = maxDiscountAmount;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
    if (validFrom !== undefined)
      updateData.validFrom = validFrom ? new Date(validFrom) : null;
    if (validTo !== undefined)
      updateData.validTo = validTo ? new Date(validTo) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/admin/coupons/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update coupon";
    return NextResponse.json(
      { success: false, error: message },
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

    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }

    if (coupon.usageCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete coupon that has been used. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await db.delete(coupons).where(eq(coupons.id, id));

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/admin/coupons/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete coupon";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
