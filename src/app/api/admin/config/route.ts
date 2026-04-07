import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin/auth";
import {
  getModelConfig,
  setModelConfig,
  getRateLimits,
  setRateLimits,
} from "@/lib/admin/store";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    model: getModelConfig(),
    rateLimits: getRateLimits(),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.model) {
    setModelConfig(body.model);
  }
  if (body.rateLimits) {
    setRateLimits(body.rateLimits);
  }

  return NextResponse.json({
    success: true,
    model: getModelConfig(),
    rateLimits: getRateLimits(),
  });
}
