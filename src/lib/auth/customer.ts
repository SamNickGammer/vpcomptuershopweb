import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
const COOKIE_NAME = "vp_customer_token";

export type CustomerJWTPayload = {
  customerId: string;
  email: string;
  name: string;
};

// ── JWT ───────────────────────────────────────────────────────────────────────
export async function signCustomerJWT(
  payload: CustomerJWTPayload,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyCustomerJWT(
  token: string,
): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as CustomerJWTPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
export async function setCustomerCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearCustomerCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCustomerFromCookie(): Promise<CustomerJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyCustomerJWT(token);
}

// ── Password ──────────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
