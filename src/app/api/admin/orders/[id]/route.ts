import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, trackingEvents, shipments } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

const statusTitleMap: Record<string, string> = {
  confirmed: "Order Confirmed",
  processing: "Processing Started",
  ready_to_ship: "Ready to Ship",
  shipped: "Order Shipped",
  delivered: "Order Delivered",
  cancelled: "Order Cancelled",
  returned: "Order Returned",
};

const updateOrderSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "processing",
      "ready_to_ship",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ])
    .optional(),
  paymentStatus: z
    .enum(["pending", "paid", "failed", "refunded"])
    .optional(),
  notes: z.string().optional().nullable(),
});

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

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Fetch items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    // Fetch tracking events ordered by createdAt asc
    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.orderId, id))
      .orderBy(asc(trackingEvents.createdAt));

    // Fetch shipment
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items,
        trackingEvents: events,
        shipment: shipment ?? null,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch order",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    // Check order exists
    const [existing] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const { status, paymentStatus, notes } = parsed.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

      // Create tracking event when status changes
      if (status && status !== existing.status) {
        await tx.insert(trackingEvents).values({
          orderId: id,
          status,
          title: statusTitleMap[status] || `Status: ${status}`,
          createdByAdminId: admin.adminId,
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("PUT /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update order",
      },
      { status: 500 }
    );
  }
}
