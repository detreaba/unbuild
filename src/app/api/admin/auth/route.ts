import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, COOKIE_NAME } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured on server" },
      { status: 500 }
    );
  }

  const valid = await verifyPassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSession();

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 86400, // 24h
  });

  return res;
}
