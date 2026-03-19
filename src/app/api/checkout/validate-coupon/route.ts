import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotal } = body as { code: string; subtotal: number };

    if (!code || typeof subtotal !== "number" || subtotal <= 0) {
      return NextResponse.json(
        { error: "Invalid request", data: { valid: false, error: "Invalid coupon code or subtotal" } },
        { status: 400 }
      );
    }

    // Look up coupon
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase().trim()))
      .limit(1);

    if (!coupon) {
      return NextResponse.json({
        data: { valid: false, error: "Coupon not found" },
      });
    }

    // Check active
    if (!coupon.isActive) {
      return NextResponse.json({
        data: { valid: false, error: "This coupon is no longer active" },
      });
    }

    // Check dates
    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return NextResponse.json({
        data: { valid: false, error: "This coupon is not yet valid" },
      });
    }
    if (coupon.validTo && now > new Date(coupon.validTo)) {
      return NextResponse.json({
        data: { valid: false, error: "This coupon has expired" },
      });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        data: { valid: false, error: "This coupon has reached its usage limit" },
      });
    }

    // Check minimum order amount
    if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
      return NextResponse.json({
        data: {
          valid: false,
          error: `Minimum order amount is ${(coupon.minOrderAmount / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 })}`,
        },
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      // Apply max discount cap
      if (coupon.maxDiscountAmount !== null && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed discount
      discount = coupon.discountValue;
    }

    // Discount cannot exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return NextResponse.json({
      data: {
        valid: true,
        discount,
        code: coupon.code,
      },
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
