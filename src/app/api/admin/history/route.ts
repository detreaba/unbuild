import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin/auth";
import { getAnalysisHistory } from "@/lib/admin/store";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const search = url.searchParams.get("search") || undefined;

  const result = getAnalysisHistory(page, pageSize, search);
  return NextResponse.json(result);
}
