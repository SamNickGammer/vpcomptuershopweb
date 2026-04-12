import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wishlists, products } from "@/lib/db/schema";
import { getCustomerFromCookie } from "@/lib/auth/customer";
import { eq, and, isNull } from "drizzle-orm";

// GET — fetch current user's wishlist with product info
export async function GET() {
  const customer = await getCustomerFromCookie();
  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const rows = await db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        variantId: wishlists.variantId,
        createdAt: wishlists.createdAt,
        product: {
          name: products.name,
          slug: products.slug,
          images: products.images,
          basePrice: products.basePrice,
          compareAtPrice: products.compareAtPrice,
          bulkPricing: products.bulkPricing,
          stock: products.stock,
          condition: products.condition,
          variants: products.variants,
        },
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.customerId, customer.customerId));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch wishlist" },
      { status: 500 },
    );
  }
}

// POST — add item to wishlist
export async function POST(req: NextRequest) {
  const customer = await getCustomerFromCookie();
  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { productId, variantId } = body as {
      productId: string;
      variantId?: string | null;
    };

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 },
      );
    }

    // Check for duplicate
    const conditions = [
      eq(wishlists.customerId, customer.customerId),
      eq(wishlists.productId, productId),
    ];
    if (variantId) {
      conditions.push(eq(wishlists.variantId, variantId));
    } else {
      conditions.push(isNull(wishlists.variantId));
    }

    const existing = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Already in wishlist" },
        { status: 409 },
      );
    }

    const [inserted] = await db
      .insert(wishlists)
      .values({
        customerId: customer.customerId,
        productId,
        variantId: variantId ?? null,
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add to wishlist" },
      { status: 500 },
    );
  }
}

// DELETE — remove item from wishlist
export async function DELETE(req: NextRequest) {
  const customer = await getCustomerFromCookie();
  if (!customer) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { productId, variantId } = body as {
      productId: string;
      variantId?: string | null;
    };

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 },
      );
    }

    const conditions = [
      eq(wishlists.customerId, customer.customerId),
      eq(wishlists.productId, productId),
    ];
    if (variantId) {
      conditions.push(eq(wishlists.variantId, variantId));
    } else {
      conditions.push(isNull(wishlists.variantId));
    }

    await db.delete(wishlists).where(and(...conditions));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishlist DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove from wishlist" },
      { status: 500 },
    );
  }
}
