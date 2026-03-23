import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema/transactions";
import { orders } from "@/lib/db/schema/orders";
import { trackingEvents } from "@/lib/db/schema/tracking";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { razorpay } from "@/lib/razorpay";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: orderId } = await params;

    // Verify the order exists and is paid
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

    if (order.paymentStatus !== "paid") {
      return NextResponse.json(
        { success: false, error: "Order payment is not in paid status" },
        { status: 400 }
      );
    }

    // Find the captured transaction for this order
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.orderId, orderId),
          eq(transactions.status, "captured")
        )
      )
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "No captured transaction found for this order",
        },
        { status: 404 }
      );
    }

    if (!transaction.razorpayPaymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "No Razorpay payment ID found for this transaction",
        },
        { status: 400 }
      );
    }

    // Initiate refund via Razorpay
    const refund = await razorpay.payments.refund(
      transaction.razorpayPaymentId,
      {
        amount: transaction.amount,
        notes: {
          reason: "Admin initiated refund (cancel & refund)",
          orderId: orderId,
        },
      }
    );

    // Update transaction
    await db
      .update(transactions)
      .set({
        status: "refunded",
        refundId: refund.id,
        refundAmount: transaction.amount,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));

    // Update order payment status
    await db
      .update(orders)
      .set({
        paymentStatus: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Create tracking event
    await db.insert(trackingEvents).values({
      orderId: orderId,
      status: "payment_refunded",
      title: "Payment Refunded",
      description: `Full refund of ${(transaction.amount / 100).toFixed(2)} INR initiated via Razorpay. Refund ID: ${refund.id}`,
      createdByAdminId: admin.adminId,
    });

    return NextResponse.json({
      success: true,
      data: {
        refundId: refund.id,
        refundAmount: transaction.amount,
        status: "refunded",
      },
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/refund error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process refund",
      },
      { status: 500 }
    );
  }
}
