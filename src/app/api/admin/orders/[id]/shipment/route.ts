import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, shipments, trackingEvents } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

const createShipmentSchema = z.object({
  provider: z.string().min(1).max(100),
  externalTrackingNumber: z.string().max(200).optional().nullable(),
  trackingUrl: z.string().optional().nullable(),
  estimatedDelivery: z.string().optional().nullable(),
});

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
    const parsed = createShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    // Check order exists
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

    const { provider, externalTrackingNumber, trackingUrl, estimatedDelivery } =
      parsed.data;

    const result = await db.transaction(async (tx) => {
      // Create shipment
      const [shipment] = await tx
        .insert(shipments)
        .values({
          orderId: id,
          provider,
          externalTrackingNumber: externalTrackingNumber ?? null,
          trackingUrl: trackingUrl ?? null,
          shippedAt: new Date(),
          estimatedDelivery: estimatedDelivery
            ? new Date(estimatedDelivery)
            : null,
        })
        .returning();

      // Update order status to shipped
      await tx
        .update(orders)
        .set({ status: "shipped", updatedAt: new Date() })
        .where(eq(orders.id, id));

      // Create tracking event
      await tx.insert(trackingEvents).values({
        orderId: id,
        status: "shipped",
        title: "Order Shipped",
        description: `Shipped via ${provider}${externalTrackingNumber ? ` (Tracking: ${externalTrackingNumber})` : ""}`,
        createdByAdminId: admin.adminId,
      });

      return shipment;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/shipment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create shipment",
      },
      { status: 500 }
    );
  }
}
