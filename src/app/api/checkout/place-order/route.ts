import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema/orders";
import { productVariants } from "@/lib/db/schema/products";
import { inventoryHistory } from "@/lib/db/schema/inventory";
import { trackingEvents } from "@/lib/db/schema/tracking";
import { coupons } from "@/lib/db/schema/coupons";
import { eq, sql } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";
import { generateInternalTrackingCode } from "@/lib/utils/tracking";

type OrderItemInput = {
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
};

type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

type PlaceOrderBody = {
  items: OrderItemInput[];
  shippingAddress: ShippingAddress;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentMethod: "cod" | "online" | "upi";
  couponCode?: string;
};

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(100 + Math.random() * 900); // 3-digit random
  return `VP-ORD-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const customer = await getCustomerFromCookie();
    if (!customer) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as PlaceOrderBody;

    // Basic validation
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "No items in order" },
        { status: 400 }
      );
    }
    if (!body.shippingAddress?.line1 || !body.shippingAddress?.city || !body.shippingAddress?.pincode) {
      return NextResponse.json(
        { error: "Incomplete shipping address" },
        { status: 400 }
      );
    }
    if (!body.customerName || !body.customerEmail) {
      return NextResponse.json(
        { error: "Customer name and email are required" },
        { status: 400 }
      );
    }
    if (!["cod", "online", "upi"].includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Validate all variants exist and have enough stock
    const variantIds = body.items.map((i) => i.variantId);
    const variants = await db
      .select({ id: productVariants.id, stock: productVariants.stock, price: productVariants.price })
      .from(productVariants)
      .where(sql`${productVariants.id} IN ${variantIds}`);

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const item of body.items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        return NextResponse.json(
          { error: `Product variant not found: ${item.productName}` },
          { status: 400 }
        );
      }
      if (variant.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${item.productName}". Available: ${variant.stock}` },
          { status: 400 }
        );
      }
    }

    // Calculate subtotal from DB prices (use server-side prices for security)
    let subtotalAmount = 0;
    for (const item of body.items) {
      const variant = variantMap.get(item.variantId)!;
      subtotalAmount += variant.price * item.quantity;
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let couponCodeUsed: string | undefined;

    if (body.couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, body.couponCode.toUpperCase().trim()))
        .limit(1);

      if (coupon && coupon.isActive) {
        const now = new Date();
        const validDate =
          (!coupon.validFrom || now >= new Date(coupon.validFrom)) &&
          (!coupon.validTo || now <= new Date(coupon.validTo));
        const withinUsage =
          coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit;
        const meetsMinimum =
          coupon.minOrderAmount === null || subtotalAmount >= coupon.minOrderAmount;

        if (validDate && withinUsage && meetsMinimum) {
          if (coupon.discountType === "percentage") {
            discountAmount = Math.round(
              (subtotalAmount * coupon.discountValue) / 100
            );
            if (
              coupon.maxDiscountAmount !== null &&
              discountAmount > coupon.maxDiscountAmount
            ) {
              discountAmount = coupon.maxDiscountAmount;
            }
          } else {
            discountAmount = coupon.discountValue;
          }
          if (discountAmount > subtotalAmount) {
            discountAmount = subtotalAmount;
          }
          couponCodeUsed = coupon.code;
        }
      }
    }

    const totalAmount = subtotalAmount - discountAmount;
    const orderNumber = generateOrderNumber();
    const trackingCode = generateInternalTrackingCode();

    // Create order
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        trackingCode,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone || null,
        shippingAddress: body.shippingAddress,
        status: "pending",
        paymentStatus: body.paymentMethod === "cod" ? "pending" : "pending",
        paymentMethod: body.paymentMethod,
        subtotalAmount,
        discountAmount,
        totalAmount,
        couponCode: couponCodeUsed || null,
      })
      .returning({ id: orders.id });

    const orderId = newOrder.id;

    // Create order items
    const orderItemValues = body.items.map((item) => ({
      orderId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName || null,
      quantity: item.quantity,
      unitPrice: variantMap.get(item.variantId)!.price,
    }));

    await db.insert(orderItems).values(orderItemValues);

    // Decrement stock and create inventory history
    for (const item of body.items) {
      await db
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, item.variantId));

      await db.insert(inventoryHistory).values({
        variantId: item.variantId,
        changeQuantity: -item.quantity,
        reason: "sale",
        note: `Order ${orderNumber}`,
      });
    }

    // Create tracking event
    await db.insert(trackingEvents).values({
      orderId,
      status: "pending",
      title: "Order Placed",
      description: `Order ${orderNumber} has been placed successfully.`,
    });

    // Increment coupon usage
    if (couponCodeUsed) {
      await db
        .update(coupons)
        .set({
          usageCount: sql`${coupons.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(coupons.code, couponCodeUsed));
    }

    return NextResponse.json({
      data: {
        orderId,
        orderNumber,
        trackingCode,
      },
    });
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}
