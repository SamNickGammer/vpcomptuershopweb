import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers, orders, orderItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";

export async function GET() {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Fetch customer (without passwordHash)
    const [customer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        isActive: customers.isActive,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(eq(customers.id, payload.customerId))
      .limit(1);

    if (!customer || !customer.isActive) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    // Fetch last 20 orders with items
    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerEmail, customer.email))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    // Fetch items for those orders
    const ordersWithItems = await Promise.all(
      customerOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        customer,
        orders: ordersWithItems,
      },
    });
  } catch (err) {
    console.error("Customer me error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
