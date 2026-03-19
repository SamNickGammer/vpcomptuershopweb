import { NextResponse } from "next/server";
import { clearCustomerCookie } from "@/lib/auth/customer";

export async function POST() {
  await clearCustomerCookie();
  return NextResponse.json({ success: true });
}
