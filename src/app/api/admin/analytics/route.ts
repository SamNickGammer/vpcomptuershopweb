import { NextRequest, NextResponse } from "next/server";
import { eq, sql, count, sum, gte, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  products,
  productVariants,
  categories,
  coupons,
} from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

function getDateCutoff(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

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
    const period = searchParams.get("period") || "30d";
    const cutoff = getDateCutoff(period);

    // Build date filter condition for orders
    const paidInPeriod = cutoff
      ? and(eq(orders.paymentStatus, "paid"), gte(orders.createdAt, cutoff))
      : eq(orders.paymentStatus, "paid");

    const inPeriod = cutoff ? gte(orders.createdAt, cutoff) : undefined;

    // ── Revenue stats ──────────────────────────────────────────────────────
    const [revenueResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
        orderCount: sql<number>`count(*)`,
      })
      .from(orders)
      .where(paidInPeriod);

    const totalRevenue = Number(revenueResult.total);
    const orderCount = Number(revenueResult.orderCount);
    const averageOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

    // ── Revenue by day ─────────────────────────────────────────────────────
    const revenueByDayRows = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
        orders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(paidInPeriod)
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    const revenueByDay = revenueByDayRows.map((row) => ({
      date: String(row.date),
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    }));

    // ── Orders by status ───────────────────────────────────────────────────
    const ordersByStatusRows = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .where(inPeriod)
      .groupBy(orders.status);

    const ordersByStatus = ordersByStatusRows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));

    // ── Payment methods ────────────────────────────────────────────────────
    const paymentMethodRows = await db
      .select({
        method: orders.paymentMethod,
        count: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(paidInPeriod)
      .groupBy(orders.paymentMethod);

    const paymentMethods = paymentMethodRows.map((row) => ({
      method: row.method,
      count: Number(row.count),
      revenue: Number(row.revenue),
    }));

    // ── Top selling products ───────────────────────────────────────────────
    const topProductsCondition = cutoff
      ? and(
          eq(orders.paymentStatus, "paid"),
          gte(orders.createdAt, cutoff)
        )
      : eq(orders.paymentStatus, "paid");

    const topProductRows = await db
      .select({
        productName: orderItems.productName,
        variantName: orderItems.variantName,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(topProductsCondition)
      .groupBy(orderItems.productName, orderItems.variantName)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(10);

    const topProducts = topProductRows.map((row) => ({
      productName: row.productName,
      variantName: row.variantName || "Default",
      quantitySold: Number(row.quantitySold),
      revenue: Number(row.revenue),
    }));

    // ── Category stats ─────────────────────────────────────────────────────
    const categoryRows = await db
      .select({
        categoryName: categories.name,
        productCount: sql<number>`count(distinct ${products.id})`,
        totalStock: sql<number>`coalesce(sum(${productVariants.stock}), 0)`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .groupBy(categories.id, categories.name)
      .orderBy(sql`count(distinct ${products.id}) desc`);

    const categoryStats = categoryRows.map((row) => ({
      categoryName: row.categoryName,
      productCount: Number(row.productCount),
      totalStock: Number(row.totalStock),
    }));

    // ── Inventory summary ──────────────────────────────────────────────────
    const [{ total: totalVariants }] = await db
      .select({ total: count() })
      .from(productVariants);

    const [{ total: outOfStock }] = await db
      .select({ total: count() })
      .from(productVariants)
      .where(sql`${productVariants.stock} = 0`);

    const [{ total: lowStock }] = await db
      .select({ total: count() })
      .from(productVariants)
      .where(
        sql`${productVariants.stock} > 0 AND ${productVariants.stock} <= ${productVariants.lowStockThreshold}`
      );

    const inStock = Number(totalVariants) - Number(outOfStock) - Number(lowStock);

    const inventorySummary = {
      totalVariants: Number(totalVariants),
      inStock,
      lowStock: Number(lowStock),
      outOfStock: Number(outOfStock),
    };

    // ── Coupon stats ───────────────────────────────────────────────────────
    const couponRows = await db
      .select({
        code: coupons.code,
        usageCount: coupons.usageCount,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
      })
      .from(coupons)
      .where(sql`${coupons.usageCount} > 0`)
      .orderBy(sql`${coupons.usageCount} desc`);

    const couponStats = couponRows.map((row) => ({
      code: row.code,
      usageCount: Number(row.usageCount),
      discountType: row.discountType,
      discountValue: Number(row.discountValue),
    }));

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          orderCount,
          averageOrderValue,
        },
        revenueByDay,
        ordersByStatus,
        paymentMethods,
        topProducts,
        categoryStats,
        inventorySummary,
        couponStats,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch analytics data",
      },
      { status: 500 }
    );
  }
}
