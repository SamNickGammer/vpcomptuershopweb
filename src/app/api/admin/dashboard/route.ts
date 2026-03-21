import { NextResponse } from "next/server";
import { eq, sql, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, orders, orderItems } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

export async function GET() {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Total products
    const [{ total: totalProducts }] = await db
      .select({ total: count() })
      .from(products);

    // Total orders
    const [{ total: totalOrders }] = await db
      .select({ total: count() })
      .from(orders);

    // Total revenue (paid orders only)
    const [revenueResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(eq(orders.paymentStatus, "paid"));
    const totalRevenue = Number(revenueResult.total);

    // Low stock count — from products table
    const [{ total: lowStockCount }] = await db
      .select({ total: count() })
      .from(products)
      .where(
        sql`${products.stock} <= ${products.lowStockThreshold}`
      );

    // Recent orders (last 5) — fetch orders then items separately
    const recentOrderRows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5);

    let recentOrders = recentOrderRows.map((o) => ({
      ...o,
      items: [] as (typeof orderItems.$inferSelect)[],
    }));

    if (recentOrderRows.length > 0) {
      const orderIds = recentOrderRows.map((o) => o.id);
      const items = await db
        .select()
        .from(orderItems)
        .where(sql`${orderItems.orderId} IN ${orderIds}`);

      recentOrders = recentOrderRows.map((o) => ({
        ...o,
        items: items.filter((item) => item.orderId === o.id),
      }));
    }

    // Orders by status
    const ordersByStatusRows = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .groupBy(orders.status);

    const ordersByStatus: Record<string, number> = {};
    for (const row of ordersByStatusRows) {
      ordersByStatus[row.status] = row.count;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalRevenue,
        lowStockCount,
        recentOrders,
        ordersByStatus,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch dashboard stats",
      },
      { status: 500 }
    );
  }
}
