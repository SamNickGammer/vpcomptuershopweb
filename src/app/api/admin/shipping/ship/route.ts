import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, shipments, trackingEvents } from "@/lib/db/schema";
import { getAdminFromCookie } from "@/lib/auth/admin";
import { shiprocket } from "@/lib/shiprocket";

const shipOrderSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(["shiprocket", "trackon", "self"]),
  weight: z.number().positive().optional().default(0.5),
  length: z.number().positive().optional().default(20),
  breadth: z.number().positive().optional().default(15),
  height: z.number().positive().optional().default(10),
  pickupLocation: z.string().optional().default("Primary"),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = shipOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      orderId,
      provider,
      weight,
      length,
      breadth,
      height,
      pickupLocation,
      trackingNumber,
      trackingUrl,
    } = parsed.data;

    // Fetch order with items
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Check if shipment already exists
    const [existingShipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, orderId))
      .limit(1);

    if (existingShipment) {
      return NextResponse.json(
        { success: false, error: "Shipment already exists for this order" },
        { status: 400 }
      );
    }

    // ── Shiprocket Flow ──────────────────────────────────────────────────────
    if (provider === "shiprocket") {
      const address = order.shippingAddress as {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
      };

      // Format order date as YYYY-MM-DD HH:MM
      const orderDate = new Date(order.createdAt)
        .toISOString()
        .replace("T", " ")
        .slice(0, 16);

      // Determine payment method for Shiprocket
      const shiprocketPaymentMethod: "Prepaid" | "COD" =
        order.paymentStatus === "paid" ? "Prepaid" : "COD";

      // Step 1: Create order on Shiprocket
      const createResult = await shiprocket.createOrder({
        orderNumber: order.orderNumber,
        orderDate,
        pickupLocation: pickupLocation!,
        billingName: order.customerName,
        billingAddress: [address.line1, address.line2]
          .filter(Boolean)
          .join(", "),
        billingCity: address.city,
        billingState: address.state,
        billingPincode: address.pincode,
        billingEmail: order.customerEmail,
        billingPhone: order.customerPhone || "",
        shippingIsBilling: true,
        items: items.map((item) => ({
          name: item.productName,
          sku: item.productId || "DEFAULT",
          units: item.quantity,
          sellingPrice: item.unitPrice / 100, // Convert paise to rupees
        })),
        subtotal: order.totalAmount / 100, // Convert paise to rupees
        weight,
        length,
        breadth,
        height,
        paymentMethod: shiprocketPaymentMethod,
      });

      if (!createResult.order_id) {
        return NextResponse.json(
          {
            success: false,
            error: `Shiprocket order creation failed: ${JSON.stringify(createResult)}`,
          },
          { status: 500 }
        );
      }

      const shiprocketOrderId = createResult.order_id;
      const shiprocketShipmentId = createResult.shipment_id;

      // Step 2: Assign AWB (courier)
      let awb = "";
      let courierName = "Shiprocket";
      let shiprocketTrackingUrl = "";

      if (shiprocketShipmentId) {
        const awbResult = await shiprocket.assignAWB(shiprocketShipmentId);

        if (awbResult.response?.data?.awb_code) {
          awb = awbResult.response.data.awb_code;
          courierName =
            awbResult.response.data.courier_name || "Shiprocket Courier";
          shiprocketTrackingUrl = `https://shiprocket.co/tracking/${awb}`;
        }

        // Step 3: Request pickup
        try {
          await shiprocket.requestPickup(shiprocketShipmentId);
        } catch (pickupErr) {
          console.warn("Pickup request failed (non-critical):", pickupErr);
        }
      }

      // Step 4: Save to DB
      const result = await db.transaction(async (tx) => {
        const [shipment] = await tx
          .insert(shipments)
          .values({
            orderId,
            provider: courierName,
            externalTrackingNumber: awb || null,
            trackingUrl: shiprocketTrackingUrl || null,
            shippedAt: new Date(),
            shiprocketShipmentId: shiprocketShipmentId || null,
            shiprocketOrderId: shiprocketOrderId || null,
          })
          .returning();

        await tx
          .update(orders)
          .set({
            status: awb ? "shipped" : "ready_to_ship",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        await tx.insert(trackingEvents).values({
          orderId,
          status: awb ? "shipped" : "ready_to_ship",
          title: awb ? "Order Shipped via Shiprocket" : "Shiprocket Order Created",
          description: awb
            ? `Courier: ${courierName}, AWB: ${awb}`
            : `Shiprocket order created. AWB assignment pending.`,
          createdByAdminId: admin.adminId,
        });

        return shipment;
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            shipmentId: result.id,
            awb,
            courier: courierName,
            trackingUrl: shiprocketTrackingUrl,
            shiprocketOrderId,
            shiprocketShipmentId,
          },
        },
        { status: 201 }
      );
    }

    // ── TrackOn Flow ─────────────────────────────────────────────────────────
    if (provider === "trackon") {
      const result = await db.transaction(async (tx) => {
        const [shipment] = await tx
          .insert(shipments)
          .values({
            orderId,
            provider: "TrackOn",
            externalTrackingNumber: trackingNumber || null,
            trackingUrl:
              trackingUrl ||
              (trackingNumber
                ? `https://trackon.in/track/${trackingNumber}`
                : null),
            shippedAt: new Date(),
          })
          .returning();

        await tx
          .update(orders)
          .set({ status: "shipped", updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        await tx.insert(trackingEvents).values({
          orderId,
          status: "shipped",
          title: "Order Shipped via TrackOn",
          description: trackingNumber
            ? `Tracking #: ${trackingNumber}`
            : "Shipped via TrackOn Courier",
          createdByAdminId: admin.adminId,
        });

        return shipment;
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            shipmentId: result.id,
            awb: trackingNumber || null,
            courier: "TrackOn",
            trackingUrl: result.trackingUrl,
          },
        },
        { status: 201 }
      );
    }

    // ── Self Delivery Flow ───────────────────────────────────────────────────
    if (provider === "self") {
      const result = await db.transaction(async (tx) => {
        const [shipment] = await tx
          .insert(shipments)
          .values({
            orderId,
            provider: "Self",
            shippedAt: new Date(),
          })
          .returning();

        await tx
          .update(orders)
          .set({ status: "shipped", updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        await tx.insert(trackingEvents).values({
          orderId,
          status: "shipped",
          title: "Self Delivery Started",
          description: "Order will be delivered by V&P Computer Shop directly.",
          createdByAdminId: admin.adminId,
        });

        return shipment;
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            shipmentId: result.id,
            courier: "Self",
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid provider" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/admin/shipping/ship error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create shipment",
      },
      { status: 500 }
    );
  }
}
