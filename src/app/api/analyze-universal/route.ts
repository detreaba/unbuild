import { NextRequest, NextResponse } from "next/server";
import { detectInputType } from "@/lib/analyzers/input-detector";
import { analyzeProduct } from "@/lib/analyzers/product-analyzer";
import { analyzeUniversal } from "@/lib/analyzers/universal-analyzer";
import { callLLM } from "@/lib/llm/provider";
import {
  UNIVERSAL_ANALYSIS_PROMPT,
  PRODUCT_ANALYSIS_PROMPT,
} from "@/lib/llm/prompts/universal-prompt";
import { INITIAL_BUILD_PROMPT_GENERATOR } from "@/lib/llm/prompts/ibp-prompt";
import { logAnalysis, checkRateLimit, logRequest, saveResult } from "@/lib/admin/store";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limited. Try again in ${rateCheck.retryAfter}s` },
      { status: 429 }
    );
  }

  logRequest({
    timestamp: new Date().toISOString(),
    path: "/api/analyze-universal",
    referrer: request.headers.get("referer") || "",
    userAgent: request.headers.get("user-agent") || "",
    ip,
  });

  const body = await request.json();
  const input = body.input as string;

  if (!input) {
    return NextResponse.json({ error: "Missing 'input' field" }, { status: 400 });
  }

  const inputType = detectInputType(input);
  const startTime = Date.now();

  try {
    let analysisContext: { formattedContext: string; metadata: Record<string, unknown> };
    let systemPrompt: string;

    if (inputType === "product") {
      const url = input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`;
      analysisContext = await analyzeProduct(url);
      systemPrompt = PRODUCT_ANALYSIS_PROMPT;
    } else {
      analysisContext = await analyzeUniversal(input);
      systemPrompt = UNIVERSAL_ANALYSIS_PROMPT;
    }

    // Generate blueprint
    const blueprintResult = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: analysisContext.formattedContext },
      ],
      { temperature: 0.3, maxTokens: 32000 }
    );

    // Generate CLAUDE.md (only if it makes sense for this input type)
    const claudeResult = await callLLM(
      [
        {
          role: "system",
          content: `Based on the following analysis, generate a CLAUDE.md file if the subject is software/website-related, or a detailed instruction manual if it's hardware/product-related. The output should be the single source of truth for building/replicating this. Output ONLY the markdown content.\n\nThe blueprint has decided the following approach:\n${blueprintResult.content.slice(0, 2000)}`,
        },
        { role: "user", content: analysisContext.formattedContext },
      ],
      { temperature: 0.2, maxTokens: 8000 }
    );

    let claudeMd = claudeResult.content.trim();
    if (claudeMd.startsWith("```")) {
      claudeMd = claudeMd.replace(/^```(?:markdown)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
    }

    // Generate Initial Build Prompt (separate call)
    const ibpContext = `## Blueprint Summary\n${blueprintResult.content.slice(0, 3000)}\n\n## CLAUDE.md Summary\n${claudeMd.slice(0, 2000)}`;
    const ibpResult = await callLLM(
      [
        { role: "system", content: INITIAL_BUILD_PROMPT_GENERATOR },
        { role: "user", content: ibpContext },
      ],
      { temperature: 0.3, maxTokens: 8000 }
    );

    const fullBlueprint = blueprintResult.content + "\n\n## Initial Build Prompt\n\n" + ibpResult.content;

    const responseData = {
      meta: {
        name: (analysisContext.metadata.title as string) || input.slice(0, 60),
        description: (analysisContext.metadata.description as string) || null,
        stars: 0,
        language: null,
        license: null,
      },
      analysis: {
        totalFiles: 0,
        totalDirs: 0,
        maxDepth: 0,
        projectType: inputType === "product" ? "Product Teardown" : "Universal Analysis",
        isMonorepo: false,
        languages: {},
        filesAnalyzed: 1,
      },
      blueprint: fullBlueprint,
      claudeMd,
      architecture: {
        overview: `${inputType} analysis of ${input}`,
        architecture: { pattern: inputType },
      },
      model: blueprintResult.model,
    };

    const slug = saveResult(input, inputType as "repo" | "website", responseData);

    logAnalysis({
      timestamp: new Date().toISOString(),
      inputType: inputType as "repo" | "website",
      input,
      projectType: responseData.analysis.projectType,
      model: blueprintResult.model,
      duration: Date.now() - startTime,
      status: "success",
    });

    return NextResponse.json({ success: true, slug, data: responseData });
  } catch (error) {
    logAnalysis({
      timestamp: new Date().toISOString(),
      inputType: inputType as "repo" | "website",
      input,
      model: "unknown",
      duration: Date.now() - startTime,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
