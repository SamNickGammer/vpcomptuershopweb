import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteShippingForItems } from "@/lib/shipping";

const shippingRateSchema = z.object({
  deliveryPincode: z.string().regex(/^\d{6}$/),
  paymentMethod: z.enum(["cod", "online", "upi"]).default("cod"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = shippingRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Valid items, payment method, and pincode are required." },
        { status: 400 }
      );
    }

    const { deliveryPincode, paymentMethod, items } = parsed.data;
    const { quote, couriers } = await quoteShippingForItems({
      items,
      deliveryPincode,
      isCod: paymentMethod === "cod",
    });

    return NextResponse.json({
      success: true,
      data: {
        available: quote.available,
        shippingAmount: quote.shippingAmount,
        estimatedDays: quote.estimatedDays,
        courierName: quote.courierName,
        courierId: quote.courierId,
        freeShippingApplied: Boolean(quote.freeShippingApplied),
        chargeableWeightGrams: quote.chargeableWeightGrams,
        packageWeightGrams: quote.packageWeightGrams,
        packageDimensions: quote.packageDimensions,
        couriers,
      },
    });
  } catch (error) {
    console.error("Checkout shipping quote error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate shipping.",
      },
      { status: 500 }
    );
  }
}
