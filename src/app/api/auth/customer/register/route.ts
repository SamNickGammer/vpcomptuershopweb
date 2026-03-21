import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  signCustomerJWT,
  setCustomerCookie,
  hashPassword,
} from "@/lib/auth/customer";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number is required").max(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone } = registerSchema.parse(body);

    // Check if email already exists
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert customer
    const [customer] = await db
      .insert(customers)
      .values({
        name,
        email,
        passwordHash,
        phone,
      })
      .returning({ id: customers.id, name: customers.name, email: customers.email });

    // Issue JWT + set cookie
    const token = await signCustomerJWT({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    });
    await setCustomerCookie(token);

    return NextResponse.json({
      success: true,
      data: { name: customer.name, email: customer.email },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }
    console.error("Customer register error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
