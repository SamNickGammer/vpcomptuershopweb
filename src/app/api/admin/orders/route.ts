import { NextRequest, NextResponse } from "next/server";
import { eq, like, and, or, sql, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
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
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(orders.status, status as typeof orders.status.enumValues[number]));
    }
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus as typeof orders.paymentStatus.enumValues[number]));
    }
    if (search) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${search}%`),
          like(orders.customerName, `%${search}%`),
          like(orders.customerEmail, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .where(whereClause);

    // Get orders
    const orderList = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Get items for these orders
    const orderIds = orderList.map((o) => o.id);
    let allItems: (typeof orderItems.$inferSelect)[] = [];

    if (orderIds.length > 0) {
      allItems = await db
        .select()
        .from(orderItems)
        .where(sql`${orderItems.orderId} IN ${orderIds}`);
    }

    const ordersWithItems = orderList.map((order) => ({
      ...order,
      items: allItems.filter((item) => item.orderId === order.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersWithItems,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}
