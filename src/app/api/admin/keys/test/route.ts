import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin/auth";
import { getDecryptedApiKey, updateApiKeyTestResult } from "@/lib/admin/store";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, provider } = await request.json();

  const key = getDecryptedApiKey(provider);
  if (!key) {
    updateApiKeyTestResult(id, "error");
    return NextResponse.json({ success: false, error: "Key not found" });
  }

  try {
    let ok = false;

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "user", content: "Say ok" }],
          max_tokens: 10,
        }),
      });
      ok = res.ok;
    } else if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      ok = res.ok;
    } else if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      ok = res.ok;
    } else if (provider === "google") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      ok = res.ok;
    }

    updateApiKeyTestResult(id, ok ? "ok" : "error");
    return NextResponse.json({ success: ok });
  } catch (err) {
    updateApiKeyTestResult(id, "error");
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    });
  }
}
