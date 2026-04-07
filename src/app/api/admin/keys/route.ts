import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin/auth";
import { getApiKeys, addApiKey, deleteApiKey } from "@/lib/admin/store";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  return NextResponse.json({ keys: getApiKeys() });
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { provider, key, label } = await request.json();

  if (!provider || !key) {
    return NextResponse.json(
      { error: "provider and key are required" },
      { status: 400 }
    );
  }

  const validProviders = ["anthropic", "openrouter", "openai", "google"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { error: `Invalid provider. Must be one of: ${validProviders.join(", ")}` },
      { status: 400 }
    );
  }

  const entry = addApiKey(provider, key, label || provider);
  return NextResponse.json({ success: true, key: entry });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deleted = deleteApiKey(id);
  return NextResponse.json({ success: deleted });
}
