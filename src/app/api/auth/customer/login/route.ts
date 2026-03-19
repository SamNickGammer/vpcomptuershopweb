import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  signCustomerJWT,
  setCustomerCookie,
  comparePassword,
} from "@/lib/auth/customer";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Find customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (!customer || !customer.isActive) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check password
    const valid = await comparePassword(password, customer.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Issue JWT + set cookie
    const token = await signCustomerJWT({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    });
    await setCustomerCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }
    console.error("Customer login error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
