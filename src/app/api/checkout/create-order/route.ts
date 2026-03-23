import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema/orders";
import { products } from "@/lib/db/schema/products";
import { inventoryHistory } from "@/lib/db/schema/inventory";
import { trackingEvents } from "@/lib/db/schema/tracking";
import { coupons } from "@/lib/db/schema/coupons";
import { transactions } from "@/lib/db/schema/transactions";
import { eq, sql } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/auth/customer";
import { generateInternalTrackingCode } from "@/lib/utils/tracking";
import { razorpay } from "@/lib/razorpay";

type OrderItemInput = {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
};

type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

type CreateOrderBody = {
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
  const random = Math.floor(100 + Math.random() * 900);
  return `VP-ORD-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const customer = await getCustomerFromCookie();
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateOrderBody;

    // Basic validation
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items in order" },
        { status: 400 }
      );
    }
    if (
      !body.shippingAddress?.line1 ||
      !body.shippingAddress?.city ||
      !body.shippingAddress?.pincode
    ) {
      return NextResponse.json(
        { success: false, error: "Incomplete shipping address" },
        { status: 400 }
      );
    }
    if (!body.customerName || !body.customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer name and email are required" },
        { status: 400 }
      );
    }
    if (!["cod", "online", "upi"].includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Validate all products exist and have enough stock
    const productIds = [
      ...new Set(body.items.map((i) => i.productId).filter(Boolean)),
    ];

    let productRows;
    if (productIds.length > 0) {
      productRows = await db
        .select()
        .from(products)
        .where(sql`${products.id} IN ${productIds}`);
    } else {
      productRows = await db
        .select()
        .from(products)
        .where(eq(products.isActive, true));
    }

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    // Build variantId → product mapping
    const variantToProduct = new Map<string, (typeof productRows)[number]>();
    for (const p of productRows) {
      const variants = (p.variants ?? []) as Array<{ variantId: string }>;
      for (const v of variants) {
        variantToProduct.set(v.variantId, p);
      }
    }

    // Resolve productId for each item and validate stock
    for (const item of body.items) {
      let product = item.productId
        ? productMap.get(item.productId)
        : undefined;
      if (!product && item.variantId) {
        product = variantToProduct.get(item.variantId);
        if (product) item.productId = product.id;
      }
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productName}` },
          { status: 400 }
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for "${item.productName}". Available: ${product.stock}`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate subtotal from DB prices (server-side for security)
    let subtotalAmount = 0;
    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      let price = product.basePrice;
      if (item.variantId) {
        const variantsArr = (product.variants ?? []) as Array<{
          variantId: string;
          price: number;
        }>;
        const variant = variantsArr.find((v) => v.variantId === item.variantId);
        if (variant) {
          price = variant.price;
        }
      }
      subtotalAmount += price * item.quantity;
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
          coupon.minOrderAmount === null ||
          subtotalAmount >= coupon.minOrderAmount;

        if (validDate && withinUsage && meetsMinimum) {
          if (coupon.discountType === "percentage") {
            discountAmount = Math.round(
              (subtotalAmount * coupon.discountValue) / 100
            );
            if (
              coupon.maxDiscountAmount !== null &&
              discountAmount > coupon.maxDiscountAmount * 100
            ) {
              discountAmount = coupon.maxDiscountAmount * 100;
            }
          } else if (coupon.discountType === "pay_amount") {
            // Customer pays only this amount, rest is discount
            const payAmount = coupon.discountValue * 100;
            discountAmount = payAmount < subtotalAmount ? subtotalAmount - payAmount : 0;
          } else {
            // Fixed — value is in rupees, convert to paise
            discountAmount = coupon.discountValue * 100;
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

    // Build order item values
    const orderItemValues = body.items.map((item) => {
      const product = productMap.get(item.productId)!;
      let price = product.basePrice;
      if (item.variantId) {
        const variantsArr = (product.variants ?? []) as Array<{
          variantId: string;
          price: number;
        }>;
        const variant = variantsArr.find((v) => v.variantId === item.variantId);
        if (variant) price = variant.price;
      }
      return {
        orderId: "", // will be set after order creation
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        variantName: item.variantName || null,
        quantity: item.quantity,
        unitPrice: price,
      };
    });

    // ── COD Flow ──────────────────────────────────────────────────────────────
    if (body.paymentMethod === "cod") {
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
          paymentMethod: "cod",
          subtotalAmount,
          discountAmount,
          totalAmount,
          couponCode: couponCodeUsed || null,
        })
        .returning({ id: orders.id });

      const orderId = newOrder.id;

      // Insert order items
      await db
        .insert(orderItems)
        .values(orderItemValues.map((v) => ({ ...v, orderId })));

      // Decrement stock and create inventory history
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
        success: true,
        data: {
          orderNumber,
          orderId,
          paymentMethod: "cod" as const,
        },
      });
    }

    // ── Online / UPI Flow ─────────────────────────────────────────────────────
    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: orderNumber,
      notes: {
        customerId: customer.customerId,
        orderNumber,
      },
    });

    // Create our DB order
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
        razorpayOrderId: razorpayOrder.id,
        subtotalAmount,
        discountAmount,
        totalAmount,
        couponCode: couponCodeUsed || null,
      })
      .returning({ id: orders.id });

    const orderId = newOrder.id;

    // Insert order items
    await db
      .insert(orderItems)
      .values(orderItemValues.map((v) => ({ ...v, orderId })));

    // Create transaction record
    await db.insert(transactions).values({
      orderId,
      customerId: customer.customerId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      status: "created",
    });

    // Do NOT decrement stock yet — wait for payment confirmation
    // Do NOT create tracking event yet

    return NextResponse.json({
      success: true,
      data: {
        orderNumber,
        orderId,
        paymentMethod: "online" as const,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.LIVE_KEY_ID,
        amount: totalAmount,
        currency: "INR",
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create order. Please try again.",
      },
      { status: 500 }
    );
  }
}
