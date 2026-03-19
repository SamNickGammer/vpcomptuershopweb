import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, trackingEvents } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";

const paymentTitleMap: Record<string, string> = {
  paid: "Payment Received",
  failed: "Payment Failed",
  refunded: "Payment Refunded",
  pending: "Payment Pending",
};

const updatePaymentSchema = z.object({
  paymentStatus: z.enum(["paid", "failed", "refunded", "pending"]),
  paymentMethod: z
    .enum(["cod", "online", "upi", "bank_transfer"])
    .optional(),
  paymentReference: z.string().optional().nullable(),
  paidAmount: z.number().int().min(0).optional(),
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
    const parsed = updatePaymentSchema.safeParse(body);
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

    const { paymentStatus, paymentMethod, paymentReference, paidAmount } =
      parsed.data;

    // COD orders can only be marked paid once delivered or ready_to_ship
    if (
      paymentStatus === "paid" &&
      (existing.paymentMethod === "cod" || paymentMethod === "cod") &&
      !["delivered", "ready_to_ship", "shipped"].includes(existing.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "COD orders can only be marked as paid once the order is ready to ship, shipped, or delivered",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      paymentStatus,
      updatedAt: new Date(),
    };

    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentReference !== undefined)
      updateData.paymentReference = paymentReference;
    if (paidAmount !== undefined) updateData.totalAmount = paidAmount;

    // Set or clear paidAt based on status
    if (paymentStatus === "paid") {
      updateData.paidAt = new Date();
    } else if (paymentStatus === "refunded" || paymentStatus === "failed") {
      updateData.paidAt = null;
    }

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

      // Create tracking event for payment status change
      await tx.insert(trackingEvents).values({
        orderId: id,
        status: existing.status,
        title: paymentTitleMap[paymentStatus] || `Payment: ${paymentStatus}`,
        description: paymentReference
          ? `Reference: ${paymentReference}`
          : undefined,
        createdByAdminId: admin.adminId,
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/payment error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update payment status";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
