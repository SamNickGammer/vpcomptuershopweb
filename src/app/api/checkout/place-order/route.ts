import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema/orders";
import { products } from "@/lib/db/schema/products";
import { inventoryHistory } from "@/lib/db/schema/inventory";
import { trackingEvents } from "@/lib/db/schema/tracking";
import { coupons } from "@/lib/db/schema/coupons";
import { eq, sql } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";
import { generateInternalTrackingCode } from "@/lib/utils/tracking";
import { resolveBulkPricing } from "@/lib/pricing";
import { quoteShippingForItems } from "@/lib/shipping";

type OrderItemInput = {
  productId: string;
  variantId?: string; // optional variantId within product's variants JSONB
  productName: string;
  variantName?: string;
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

    // Validate all products exist and have enough stock
    // Items may have productId directly, or we need to look up all products
    const productIds = [...new Set(body.items.map((i) => i.productId).filter(Boolean))];

    let productRows;
    if (productIds.length > 0) {
      productRows = await db
        .select()
        .from(products)
        .where(sql`${products.id} IN ${productIds}`);
    } else {
      // Fallback: fetch all active products and match by variantId
      productRows = await db.select().from(products).where(eq(products.isActive, true));
    }

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    // Also build a variantId → product mapping for items without productId
    const variantToProduct = new Map<string, typeof productRows[number]>();
    for (const p of productRows) {
      const variants = (p.variants ?? []) as Array<{ variantId: string }>;
      for (const v of variants) {
        variantToProduct.set(v.variantId, p);
      }
    }

    // Resolve productId for each item and validate stock
    for (const item of body.items) {
      let product = item.productId ? productMap.get(item.productId) : undefined;
      if (!product && item.variantId) {
        product = variantToProduct.get(item.variantId);
        if (product) item.productId = product.id; // backfill
      }
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productName}` },
          { status: 400 }
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${item.productName}". Available: ${product.stock}` },
          { status: 400 }
        );
      }
    }

    const resolvedUnitPrices = body.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId
        ? (product.variants ?? []).find((entry) => entry.variantId === item.variantId)
        : undefined;

      return resolveBulkPricing({
        basePrice: variant?.price ?? product.basePrice,
        quantity: item.quantity,
        bulkPricing: variant?.bulkPricing ?? product.bulkPricing,
      }).unitPrice;
    });

    const subtotalAmount = body.items.reduce(
      (sum, item, index) => sum + resolvedUnitPrices[index] * item.quantity,
      0
    );

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

    const shippingResult = await quoteShippingForItems({
      items: body.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      deliveryPincode: body.shippingAddress.pincode,
      isCod: body.paymentMethod === "cod",
    });

    if (!shippingResult.quote.available) {
      return NextResponse.json(
        { error: "Shipping is not available for this pincode right now." },
        { status: 400 }
      );
    }

    const shippingAmount = shippingResult.quote.shippingAmount;
    const totalAmount = subtotalAmount - discountAmount + shippingAmount;
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
        paymentStatus: "pending",
        paymentMethod: body.paymentMethod,
        subtotalAmount,
        discountAmount,
        shippingAmount,
        shippingQuote: shippingResult.quote,
        totalAmount,
        couponCode: couponCodeUsed || null,
      })
      .returning({ id: orders.id });

    const orderId = newOrder.id;

    // Create order items
    const orderItemValues = body.items.map((item, index) => {
      return {
        orderId,
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        variantName: item.variantName || null,
        quantity: item.quantity,
        unitPrice: resolvedUnitPrices[index],
      };
    });

    await db.insert(orderItems).values(orderItemValues);

    // Decrement stock on products table and create inventory history
    for (const item of body.items) {
      await db
        .update(products)
        .set({
          stock: sql`${products.stock} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));

      await db.insert(inventoryHistory).values({
        productId: item.productId,
        variantId: item.variantId || null,
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
