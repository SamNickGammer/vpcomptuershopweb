import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { transactions } from "@/lib/db/schema/transactions";
import { eq } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";

type PaymentFailedBody = {
  razorpay_order_id: string;
  error_code?: string;
  error_description?: string;
  orderId: string;
};

export async function POST(req: NextRequest) {
  try {
    const customer = await getCustomerFromCookie();
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as PaymentFailedBody;

    if (!body.razorpay_order_id || !body.orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update transaction status to failed
    await db
      .update(transactions)
      .set({
        status: "failed",
        errorCode: body.error_code || null,
        errorDescription: body.error_description || null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.razorpayOrderId, body.razorpay_order_id));

    // Update order payment status to failed
    await db
      .update(orders)
      .set({
        paymentStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, body.orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment failed handler error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process payment failure." },
      { status: 500 }
    );
  }
}
