import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, trackingEvents, shipments, transactions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Fetch order by ID
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 },
      );
    }

    // Verify this order belongs to the customer (match email)
    if (order.customerEmail !== payload.email) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 },
      );
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Fetch tracking events (ordered by createdAt asc)
    const timeline = await db
      .select({
        id: trackingEvents.id,
        status: trackingEvents.status,
        title: trackingEvents.title,
        description: trackingEvents.description,
        createdAt: trackingEvents.createdAt,
      })
      .from(trackingEvents)
      .where(eq(trackingEvents.orderId, order.id))
      .orderBy(asc(trackingEvents.createdAt));

    // Fetch shipment (if exists)
    const [shipment] = await db
      .select({
        id: shipments.id,
        provider: shipments.provider,
        externalTrackingNumber: shipments.externalTrackingNumber,
        trackingUrl: shipments.trackingUrl,
        shippedAt: shipments.shippedAt,
        estimatedDelivery: shipments.estimatedDelivery,
      })
      .from(shipments)
      .where(eq(shipments.orderId, order.id))
      .limit(1);

    // Fetch transaction (if exists)
    const [txn] = await db
      .select({
        razorpayPaymentId: transactions.razorpayPaymentId,
        amount: transactions.amount,
        status: transactions.status,
        method: transactions.method,
        refundAmount: transactions.refundAmount,
      })
      .from(transactions)
      .where(eq(transactions.orderId, order.id))
      .limit(1);

    // Build customer-safe order data (no admin notes, no admin IDs)
    const safeOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      trackingCode: order.trackingCode,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      couponCode: order.couponCode,
      createdAt: order.createdAt,
      items,
      timeline,
      shipment: shipment || null,
      transaction: txn || null,
    };

    return NextResponse.json({
      success: true,
      data: { order: safeOrder },
    });
  } catch (err) {
    console.error("Customer order detail error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
