import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema/transactions";
import { orders } from "@/lib/db/schema/orders";
import { customers } from "@/lib/db/schema/customers";
import { trackingEvents } from "@/lib/db/schema/tracking";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { razorpay } from "@/lib/razorpay";

export async function GET(
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

    const { id } = await params;

    const [transaction] = await db
      .select({
        id: transactions.id,
        orderId: transactions.orderId,
        customerId: transactions.customerId,
        razorpayOrderId: transactions.razorpayOrderId,
        razorpayPaymentId: transactions.razorpayPaymentId,
        razorpaySignature: transactions.razorpaySignature,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        method: transactions.method,
        errorCode: transactions.errorCode,
        errorDescription: transactions.errorDescription,
        refundId: transactions.refundId,
        refundAmount: transactions.refundAmount,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        orderNumber: orders.orderNumber,
        orderId2: orders.id,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(transactions)
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .where(eq(transactions.id, id))
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error("GET /api/admin/transactions/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch transaction",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
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

    const { id } = await params;
    const body = await request.json();

    if (body.action !== "refund") {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // Fetch the transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status !== "captured") {
      return NextResponse.json(
        {
          success: false,
          error: "Only captured payments can be refunded",
        },
        { status: 400 }
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

    // Determine refund amount (in paise)
    const refundAmount =
      body.amount && Number(body.amount) > 0
        ? Number(body.amount)
        : transaction.amount;

    if (refundAmount > transaction.amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Refund amount cannot exceed the transaction amount",
        },
        { status: 400 }
      );
    }

    // Initiate refund via Razorpay
    const refund = await razorpay.payments.refund(
      transaction.razorpayPaymentId,
      {
        amount: refundAmount,
        notes: {
          reason: "Admin initiated refund",
          orderId: transaction.orderId || "",
        },
      }
    );

    // Update transaction
    await db
      .update(transactions)
      .set({
        status: "refunded",
        refundId: refund.id,
        refundAmount: refundAmount,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    // Update order payment status if order exists
    if (transaction.orderId) {
      await db
        .update(orders)
        .set({
          paymentStatus: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, transaction.orderId));

      // Create tracking event
      await db.insert(trackingEvents).values({
        orderId: transaction.orderId,
        status: "payment_refunded",
        title: "Payment Refunded",
        description: `Refund of ${(refundAmount / 100).toFixed(2)} INR initiated. Refund ID: ${refund.id}`,
        createdByAdminId: admin.adminId,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        refundId: refund.id,
        refundAmount,
        status: "refunded",
      },
    });
  } catch (error) {
    console.error("POST /api/admin/transactions/[id] refund error:", error);
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
