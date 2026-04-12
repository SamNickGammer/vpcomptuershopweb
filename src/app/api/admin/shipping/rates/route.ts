import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { shiprocket } from "@/lib/shiprocket";
import { buildQuoteFromPackage } from "@/lib/shipping";
import type { OrderShippingQuote, ProductShippingDimensions } from "@/lib/db/schema";

// GET: Check available couriers + rates for an order before shipping
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = request.nextUrl.searchParams.get("orderId");
    const weight = parseFloat(request.nextUrl.searchParams.get("weight") || "0");
    const length = parseFloat(request.nextUrl.searchParams.get("length") || "0");
    const breadth = parseFloat(request.nextUrl.searchParams.get("breadth") || "0");
    const height = parseFloat(request.nextUrl.searchParams.get("height") || "0");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId required" },
        { status: 400 }
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const address = order.shippingAddress as {
      pincode?: string;
      line1?: string;
      city?: string;
      state?: string;
    };

    if (!address?.pincode) {
      return NextResponse.json(
        { success: false, error: "Order has no delivery pincode" },
        { status: 400 }
      );
    }

    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "824120";
    const isCod = order.paymentMethod === "cod";
    const savedQuote = order.shippingQuote as OrderShippingQuote | null;
    const savedDimensions = savedQuote?.packageDimensions as
      | ProductShippingDimensions
      | undefined;

    const packageWeightGrams =
      weight > 0
        ? Math.ceil(weight * 1000)
        : savedQuote?.packageWeightGrams || 500;
    const packageDimensions: ProductShippingDimensions = {
      lengthCm:
        length > 0
          ? Math.ceil(length)
          : savedDimensions?.lengthCm || 20,
      breadthCm:
        breadth > 0
          ? Math.ceil(breadth)
          : savedDimensions?.breadthCm || 15,
      heightCm:
        height > 0
          ? Math.ceil(height)
          : savedDimensions?.heightCm || 10,
    };
    const volumetricWeightGrams = Math.ceil(
      (packageDimensions.lengthCm *
        packageDimensions.breadthCm *
        packageDimensions.heightCm *
        1000) /
        5000
    );
    const chargeableWeightKg = Number(
      (Math.max(packageWeightGrams, volumetricWeightGrams) / 1000).toFixed(3)
    );

    const data = await shiprocket.checkServiceability({
      pickupPincode,
      deliveryPincode: address.pincode,
      weight: chargeableWeightKg,
      cod: isCod,
    });

    if (
      !data?.data?.available_courier_companies ||
      data.data.available_courier_companies.length === 0
    ) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          message: "No couriers available for this pincode",
          couriers: [],
        },
      });
    }

    const couriers = data.data.available_courier_companies.map(
      (c: {
        courier_company_id: number;
        courier_name: string;
        rate: number;
        etd: string;
        estimated_delivery_days: number;
        cod_charges: number;
        freight_charge: number;
        rto_charges: number;
        rating: number;
      }) => ({
        courierId: c.courier_company_id,
        courierName: c.courier_name,
        totalRate: Math.ceil(c.rate),
        freightCharge: Math.ceil(c.freight_charge),
        codCharges: Math.ceil(c.cod_charges || 0),
        rtoCharges: Math.ceil(c.rto_charges || 0),
        etd: c.etd,
        estimatedDays: c.estimated_delivery_days,
        rating: c.rating,
      })
    );

    couriers.sort(
      (a: { totalRate: number }, b: { totalRate: number }) =>
        a.totalRate - b.totalRate
    );
    const quote = buildQuoteFromPackage({
      deliveryPincode: address.pincode,
      isCod,
      packageWeightGrams,
      packageDimensions,
      fallbackApplied: Boolean(savedQuote?.fallbackApplied),
      couriers: couriers.map((courier: (typeof couriers)[number]) => ({
        courierId: courier.courierId,
        courierName: courier.courierName,
        shippingAmount: courier.totalRate * 100,
        estimatedDays: courier.estimatedDays,
        etd: courier.etd,
        codCharge: courier.codCharges * 100,
        freightCharge: courier.freightCharge * 100,
        rtoCharge: courier.rtoCharges * 100,
        rating: courier.rating,
      })),
    });

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        orderNumber: order.orderNumber,
        orderTotal: order.totalAmount,
        paymentMethod: order.paymentMethod,
        deliveryPincode: address.pincode,
        packageWeightGrams,
        chargeableWeightGrams: quote.chargeableWeightGrams,
        packageDimensions,
        quotedShippingAmount: savedQuote?.shippingAmount || 0,
        couriers,
      },
    });
  } catch (error) {
    console.error("Shipping rates error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch shipping rates",
      },
      { status: 500 }
    );
  }
}
