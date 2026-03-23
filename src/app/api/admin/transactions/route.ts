import { NextRequest, NextResponse } from "next/server";
import { eq, desc, count, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema/transactions";
import { orders } from "@/lib/db/schema/orders";
import { customers } from "@/lib/db/schema/customers";
import { getAdminFromCookie } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20)
    );
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(transactions.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(transactions)
      .where(whereClause);

    // Get transactions with order number and customer name via joins
    const transactionList = await db
      .select({
        id: transactions.id,
        orderId: transactions.orderId,
        customerId: transactions.customerId,
        razorpayOrderId: transactions.razorpayOrderId,
        razorpayPaymentId: transactions.razorpayPaymentId,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        method: transactions.method,
        errorCode: transactions.errorCode,
        errorDescription: transactions.errorDescription,
        refundId: transactions.refundId,
        refundAmount: transactions.refundAmount,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(transactions)
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactionList,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/transactions error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}
