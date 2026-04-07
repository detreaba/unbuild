import type { AnalysisContext } from "./analyzer-types";

export async function analyzeUniversal(input: string): Promise<AnalysisContext> {
  let context: string;
  const metadata: Record<string, unknown> = {};

  // If it looks like a URL, try to fetch it
  if (input.match(/^https?:\/\//)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(input, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html, application/json, */*",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = res.headers.get("content-type") || "";
      const body = await res.text();

      if (contentType.includes("json")) {
        // JSON response — could be API spec, data, etc.
        const truncated = body.length > 30000 ? body.slice(0, 30000) + "\n... truncated" : body;
        context = `# URL Analysis: ${input}\n**Content-Type:** ${contentType}\n\n## JSON Content\n\`\`\`json\n${truncated}\n\`\`\``;
        metadata.contentType = "json";
      } else {
        // HTML or other content
        let cleaned = body
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/\s{2,}/g, " ");
        if (cleaned.length > 20000) cleaned = cleaned.slice(0, 20000) + "\n<!-- truncated -->";
        context = `# URL Analysis: ${input}\n**Content-Type:** ${contentType}\n\n## Page Content\n\`\`\`html\n${cleaned}\n\`\`\``;
        metadata.contentType = contentType;
      }
    } catch {
      context = `# Analysis Request\n\nCould not fetch URL: ${input}\n\nAnalyze based on the URL pattern and any information you can infer.`;
    }
  } else {
    // Plain text input — pass directly to LLM
    context = `# Analysis Request\n\nThe user wants to reverse engineer the following:\n\n${input}`;
    metadata.contentType = "text";
  }

  // Cap total context
  if (context.length > 40000) {
    context = context.slice(0, 40000) + "\n<!-- truncated -->";
  }

  return {
    inputType: "unknown",
    formattedContext: context,
    metadata,
  };
}
