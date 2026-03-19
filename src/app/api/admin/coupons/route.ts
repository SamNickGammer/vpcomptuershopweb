import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().min(1),
  minOrderAmount: z.number().int().min(0).optional().nullable(),
  maxDiscountAmount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const allCoupons = await db
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt));

    return NextResponse.json({ success: true, data: allCoupons });
  } catch (error) {
    console.error("GET /api/admin/coupons error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch coupons";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
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

    const normalizedCode = code.trim().toUpperCase();

    // Check uniqueness
    const [existing] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, normalizedCode))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Coupon code already exists" },
        { status: 409 }
      );
    }

    const [coupon] = await db
      .insert(coupons)
      .values({
        code: normalizedCode,
        description: description ?? null,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount ?? null,
        maxDiscountAmount: maxDiscountAmount ?? null,
        usageLimit: usageLimit ?? null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: coupon },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/coupons error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create coupon";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
