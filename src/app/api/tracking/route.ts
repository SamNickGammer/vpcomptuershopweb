import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, trackingEvents, shipments } from "@/lib/db/schema";
import { formatPrice } from "@/lib/utils/helpers";

export async function GET(request: NextRequest) {
  try {
    const orderNumber = request.nextUrl.searchParams.get("orderNumber")?.trim();

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "Order number is required" },
        { status: 400 }
      );
    }

    // Find order by order number
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found. Please check your order number." },
        { status: 404 }
      );
    }

    // Fetch items, events, shipment in parallel
    const [items, events, shipmentRows] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      db
        .select({
          id: trackingEvents.id,
          status: trackingEvents.status,
          title: trackingEvents.title,
          description: trackingEvents.description,
          createdAt: trackingEvents.createdAt,
        })
        .from(trackingEvents)
        .where(eq(trackingEvents.orderId, order.id)),
      db.select().from(shipments).where(eq(shipments.orderId, order.id)),
    ]);

    // Return only customer-safe data (no internal notes, admin IDs)
    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        subtotalAmount: order.subtotalAmount,
        discountAmount: order.discountAmount,
        couponCode: order.couponCode,
        createdAt: order.createdAt,
        items: items.map((item) => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        timeline: events
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          .map((e) => ({
            title: e.title,
            description: e.description,
            date: e.createdAt,
          })),
        shipment: shipmentRows[0]
          ? {
              provider: shipmentRows[0].provider,
              trackingNumber: shipmentRows[0].externalTrackingNumber,
              trackingUrl: shipmentRows[0].trackingUrl,
              shippedAt: shipmentRows[0].shippedAt,
              estimatedDelivery: shipmentRows[0].estimatedDelivery,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to look up order" },
      { status: 500 }
    );
  }
}
