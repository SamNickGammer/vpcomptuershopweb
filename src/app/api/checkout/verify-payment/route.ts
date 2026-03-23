import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema/orders";
import { products } from "@/lib/db/schema/products";
import { inventoryHistory } from "@/lib/db/schema/inventory";
import { trackingEvents } from "@/lib/db/schema/tracking";
import { transactions } from "@/lib/db/schema/transactions";
import { coupons } from "@/lib/db/schema/coupons";
import { eq, sql } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";

type VerifyPaymentBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderId: string;
};

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const customer = await getCustomerFromCookie();
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as VerifyPaymentBody;

    if (
      !body.razorpay_order_id ||
      !body.razorpay_payment_id ||
      !body.razorpay_signature ||
      !body.orderId
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.LIVE_KEY_SECRET!)
      .update(body.razorpay_order_id + "|" + body.razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== body.razorpay_signature) {
      // Signature mismatch — mark as failed
      await db
        .update(transactions)
        .set({
          status: "failed",
          errorDescription: "Signature mismatch",
          updatedAt: new Date(),
        })
        .where(eq(transactions.razorpayOrderId, body.razorpay_order_id));

      await db
        .update(orders)
        .set({
          paymentStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, body.orderId));

      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Signature valid — process successful payment

    // Get the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, body.orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Update order
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentMethod: "online",
        paidAt: new Date(),
        paymentReference: body.razorpay_payment_id,
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, body.orderId));

    // Update transaction
    await db
      .update(transactions)
      .set({
        status: "captured",
        razorpayPaymentId: body.razorpay_payment_id,
        razorpaySignature: body.razorpay_signature,
        updatedAt: new Date(),
      })
      .where(eq(transactions.razorpayOrderId, body.razorpay_order_id));

    // Get order items to decrement stock
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, body.orderId));

    // Decrement stock and create inventory history
    for (const item of items) {
      if (item.productId) {
        await db
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));

        await db.insert(inventoryHistory).values({
          productId: item.productId,
          variantId: item.variantId || null,
          changeQuantity: -item.quantity,
          reason: "sale",
          note: `Order ${order.orderNumber}`,
        });
      }
    }

    // Create tracking events
    await db.insert(trackingEvents).values([
      {
        orderId: body.orderId,
        status: "pending",
        title: "Order Placed",
        description: `Order ${order.orderNumber} has been placed successfully.`,
      },
      {
        orderId: body.orderId,
        status: "confirmed",
        title: "Payment Received",
        description: `Payment of ${order.totalAmount} paise received via Razorpay. Payment ID: ${body.razorpay_payment_id}`,
      },
    ]);

    // Increment coupon usage if applicable
    if (order.couponCode) {
      await db
        .update(coupons)
        .set({
          usageCount: sql`${coupons.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(coupons.code, order.couponCode));
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { success: false, error: "Payment verification failed. Please contact support." },
      { status: 500 }
    );
  }
}
