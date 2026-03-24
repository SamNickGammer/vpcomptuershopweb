import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, trackingEvents, shipments } from "@/lib/db/schema";

// Map Shiprocket statuses to our order status enum
function mapShiprocketStatus(
  srStatus: string
): "processing" | "ready_to_ship" | "shipped" | "delivered" | "returned" | "cancelled" | null {
  const status = srStatus.toUpperCase().trim();

  if (status === "NEW" || status === "PICKUP SCHEDULED") {
    return "processing";
  }
  if (status === "PICKUP GENERATED" || status === "OUT FOR PICKUP") {
    return "ready_to_ship";
  }
  if (
    status === "PICKED UP" ||
    status === "IN TRANSIT" ||
    status === "REACHED AT DESTINATION HUB" ||
    status === "OUT FOR DELIVERY"
  ) {
    return "shipped";
  }
  if (status === "DELIVERED") {
    return "delivered";
  }
  if (
    status === "RTO INITIATED" ||
    status === "RTO IN TRANSIT" ||
    status === "RTO DELIVERED"
  ) {
    return "returned";
  }
  if (status === "CANCELLED") {
    return "cancelled";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token (sent by Shiprocket in x-api-key header)
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    if (webhookToken) {
      const receivedToken = request.headers.get("x-api-key");
      if (receivedToken !== webhookToken) {
        return NextResponse.json(
          { status: "error", message: "Invalid webhook token" },
          { status: 401 }
        );
      }
    }

    const payload = await request.json();

    // Shiprocket webhook payload fields
    const srOrderId = payload.order_id || payload.shiprocket_order_id;
    const srStatus = payload.current_status || payload.status;
    const srStatusDescription =
      payload.current_status_description ||
      payload.status_description ||
      srStatus;
    const awb = payload.awb || payload.awb_code;

    if (!srOrderId && !awb) {
      return NextResponse.json(
        { status: "error", message: "Missing order_id or awb" },
        { status: 400 }
      );
    }

    // Try to find the order by Shiprocket order ID from shipments table
    let shipment = null;

    if (srOrderId) {
      // Shiprocket order_id field contains our orderNumber
      // First try matching by shiprocketOrderId in shipments
      const [byShiprocketId] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.shiprocketOrderId, Number(srOrderId)))
        .limit(1);

      if (byShiprocketId) {
        shipment = byShiprocketId;
      } else {
        // Try matching by order number
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, String(srOrderId)))
          .limit(1);

        if (order) {
          const [orderShipment] = await db
            .select()
            .from(shipments)
            .where(eq(shipments.orderId, order.id))
            .limit(1);
          shipment = orderShipment || null;
        }
      }
    }

    // Fallback: find by AWB
    if (!shipment && awb) {
      const [byAwb] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.externalTrackingNumber, String(awb)))
        .limit(1);
      shipment = byAwb || null;
    }

    if (!shipment) {
      // Order not found — not an error for webhook, just ignore
      console.warn(
        `Shiprocket webhook: no matching shipment for order_id=${srOrderId}, awb=${awb}`
      );
      return NextResponse.json({ status: "ok", message: "No matching order" });
    }

    const orderId = shipment.orderId;

    // Map status
    const mappedStatus = mapShiprocketStatus(srStatus || "");

    if (mappedStatus) {
      // Update order status
      await db
        .update(orders)
        .set({ status: mappedStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      // Create tracking event
      await db.insert(trackingEvents).values({
        orderId,
        status: mappedStatus,
        title: `Shiprocket: ${srStatus}`,
        description: srStatusDescription || null,
      });
    } else if (srStatus) {
      // Unknown status — still log the tracking event
      await db.insert(trackingEvents).values({
        orderId,
        status: "shipped",
        title: `Shiprocket Update: ${srStatus}`,
        description: srStatusDescription || null,
      });
    }

    // Update AWB on shipment if provided and not already set
    if (awb && !shipment.externalTrackingNumber) {
      await db
        .update(shipments)
        .set({
          externalTrackingNumber: String(awb),
          trackingUrl: `https://shiprocket.co/tracking/${awb}`,
        })
        .where(eq(shipments.id, shipment.id));
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Shiprocket webhook error:", error);
    // Return 200 to prevent Shiprocket from retrying on our errors
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Internal error",
    });
  }
}
