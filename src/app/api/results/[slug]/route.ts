import { NextRequest, NextResponse } from "next/server";
import { getResult } from "@/lib/admin/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const result = getResult(slug);

  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
