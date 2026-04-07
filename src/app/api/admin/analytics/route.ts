import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin/auth";
import { getAnalytics } from "@/lib/admin/store";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getAnalytics());
}
