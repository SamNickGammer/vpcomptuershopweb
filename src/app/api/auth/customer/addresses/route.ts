import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getCustomerFromCookie } from "@/lib/auth/customer";
import type { CustomerAddress } from "@/lib/db/schema/customers";
import { randomUUID } from "crypto";

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  phone: z.string().min(10).max(20),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(6).max(6),
  isDefault: z.boolean().optional(),
});

// GET — list addresses
export async function GET() {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const [customer] = await db
      .select({ addresses: customers.addresses })
      .from(customers)
      .where(eq(customers.id, payload.customerId))
      .limit(1);

    return NextResponse.json({ success: true, data: customer?.addresses || [] });
  } catch (error) {
    console.error("GET addresses error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch addresses" }, { status: 500 });
  }
}

// POST — add new address
export async function POST(request: NextRequest) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const [customer] = await db
      .select({ addresses: customers.addresses })
      .from(customers)
      .where(eq(customers.id, payload.customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const existing = (customer.addresses || []) as CustomerAddress[];
    const newAddress: CustomerAddress = {
      id: randomUUID(),
      ...parsed.data,
      line2: parsed.data.line2 || "",
      isDefault: parsed.data.isDefault ?? existing.length === 0, // first address is default
    };

    // If new is default, un-default others
    let updated = existing;
    if (newAddress.isDefault) {
      updated = existing.map((a) => ({ ...a, isDefault: false }));
    }
    updated.push(newAddress);

    await db
      .update(customers)
      .set({ addresses: updated, updatedAt: new Date() })
      .where(eq(customers.id, payload.customerId));

    return NextResponse.json({ success: true, data: updated }, { status: 201 });
  } catch (error) {
    console.error("POST address error:", error);
    return NextResponse.json({ success: false, error: "Failed to add address" }, { status: 500 });
  }
}

// PUT — update address (set default, edit)
export async function PUT(request: NextRequest) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { addressId, ...updates } = body;

    if (!addressId) {
      return NextResponse.json({ success: false, error: "addressId required" }, { status: 400 });
    }

    const [customer] = await db
      .select({ addresses: customers.addresses })
      .from(customers)
      .where(eq(customers.id, payload.customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    let addresses = (customer.addresses || []) as CustomerAddress[];
    const idx = addresses.findIndex((a) => a.id === addressId);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    // If setting as default, un-default all others
    if (updates.isDefault) {
      addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    }

    addresses[idx] = { ...addresses[idx], ...updates, id: addressId };

    await db
      .update(customers)
      .set({ addresses, updatedAt: new Date() })
      .where(eq(customers.id, payload.customerId));

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error("PUT address error:", error);
    return NextResponse.json({ success: false, error: "Failed to update address" }, { status: 500 });
  }
}

// DELETE — remove address
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { addressId } = await request.json();
    if (!addressId) {
      return NextResponse.json({ success: false, error: "addressId required" }, { status: 400 });
    }

    const [customer] = await db
      .select({ addresses: customers.addresses })
      .from(customers)
      .where(eq(customers.id, payload.customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    let addresses = (customer.addresses || []) as CustomerAddress[];
    const removed = addresses.find((a) => a.id === addressId);
    addresses = addresses.filter((a) => a.id !== addressId);

    // If removed was default and there are others, make first one default
    if (removed?.isDefault && addresses.length > 0) {
      addresses[0].isDefault = true;
    }

    await db
      .update(customers)
      .set({ addresses, updatedAt: new Date() })
      .where(eq(customers.id, payload.customerId));

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error("DELETE address error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete address" }, { status: 500 });
  }
}
