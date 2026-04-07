import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import * as crypto from "crypto";

const COOKIE_NAME = "gb_admin_session";
const SESSION_DURATION = "24h";

function getSecret(): Uint8Array {
  const password = process.env.ADMIN_PASSWORD || "unbuild-change-me";
  const hash = crypto.createHash("sha256").update(password).digest();
  return new Uint8Array(hash);
}

function getPasswordHash(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD not set in environment");
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function verifyPassword(input: string): Promise<boolean> {
  const expected = getPasswordHash();
  const inputHash = crypto.createHash("sha256").update(input).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(inputHash, "hex")
  );
}

export async function createSession(): Promise<string> {
  const secret = getSecret();
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secret);
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySession(token);
}

export { COOKIE_NAME };
