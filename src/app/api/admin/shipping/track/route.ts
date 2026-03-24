import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shipments } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { shiprocket } from "@/lib/shiprocket";

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
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    // Find shipment for this order
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, orderId))
      .limit(1);

    if (!shipment) {
      return NextResponse.json(
        { success: false, error: "No shipment found for this order" },
        { status: 404 }
      );
    }

    // If it's a Shiprocket shipment, fetch live tracking
    if (
      shipment.externalTrackingNumber &&
      (shipment.shiprocketShipmentId || shipment.provider?.toLowerCase().includes("shiprocket") || shipment.shiprocketOrderId)
    ) {
      const trackingData = await shiprocket.getTrackingByAWB(
        shipment.externalTrackingNumber
      );

      return NextResponse.json({
        success: true,
        data: {
          shipment,
          tracking: trackingData,
          source: "shiprocket",
        },
      });
    }

    // For non-Shiprocket shipments, return just the shipment data
    return NextResponse.json({
      success: true,
      data: {
        shipment,
        tracking: null,
        source: shipment.provider?.toLowerCase() || "unknown",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/shipping/track error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch tracking data",
      },
      { status: 500 }
    );
  }
}
