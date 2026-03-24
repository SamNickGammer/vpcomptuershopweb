import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { shiprocket } from "@/lib/shiprocket";

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
    const weight = parseFloat(request.nextUrl.searchParams.get("weight") || "0.5");

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

    const pickupPincode = "824120"; // Your pickup location
    const isCod = order.paymentMethod === "cod";

    const data = await shiprocket.checkServiceability({
      pickupPincode,
      deliveryPincode: address.pincode,
      weight,
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

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        orderNumber: order.orderNumber,
        orderTotal: order.totalAmount,
        paymentMethod: order.paymentMethod,
        deliveryPincode: address.pincode,
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
