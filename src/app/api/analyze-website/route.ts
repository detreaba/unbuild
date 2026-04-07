import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsite } from "@/lib/analyzers/website-analyzer";
import { callLLM } from "@/lib/llm/provider";
import { WEBSITE_CLONE_PROMPT } from "@/lib/llm/prompts/architecture-prompt";
import { INITIAL_BUILD_PROMPT_GENERATOR } from "@/lib/llm/prompts/ibp-prompt";
import { logAnalysis, checkRateLimit, logRequest, saveResult } from "@/lib/admin/store";

const WEBSITE_ARCHITECTURE_PROMPT = `You are performing FORENSIC architecture analysis of a website. Think deeply. Output ONLY valid JSON — no markdown, no explanation.

CHAIN OF VERIFICATION before outputting:
1. Every "detectedTech" claim — do I have HTML class/script/meta evidence? If not, say "Not detected."
2. "productCategory" — does it describe what the product DOES, not just "a website"?
3. "backendInference.requiredAPIs" — are these realistic for THIS specific product?
4. "reproductionChallenges" — are these specific to THIS project, not generic "responsive design"?
5. Am I claiming exactly ONE framework, not multiple?

RULES:
- Only claim a framework if you see CLEAR evidence (e.g., __nuxt, __next, data-reactroot, ng-version in the HTML). If unclear, say "Not detected — recommend [X] for rebuild."
- NEVER list multiple competing frameworks.
- Describe what the product DOES, not just what the page looks like.
- For every claim, cite the HTML evidence (class name, data attribute, meta tag, script src) that supports it.
- Think about what BACKEND this product needs — even if you can only see the frontend.

{
  "overview": "What this product IS and DOES. Not 'a website with sections' — describe the actual service/product in 2-3 sentences.",
  "productCategory": "The product category for open-source research (e.g., 'business intelligence platform', 'email service', 'project management tool', 'e-commerce platform')",
  "detectedTech": {
    "framework": "Detected framework with evidence (e.g., 'Nuxt.js — __nuxt div found in HTML') or 'Not detected'",
    "cssFramework": "Detected CSS framework with evidence (e.g., 'Semantic UI — ui container classes throughout') or 'Custom CSS'",
    "jsLibraries": ["list of detected JS libraries with evidence — script src URLs, global variables, class patterns"],
    "fonts": ["font families detected from CSS or Google Fonts links"],
    "analytics": ["tracking scripts detected — Google Analytics, HubSpot, etc."],
    "cdn": "CDN detected (Cloudflare, Fastly, etc.) or 'Not detected'",
    "recommendedStack": "What tech stack to USE for the rebuild, based on product complexity"
  },
  "architecture": {
    "pattern": "Specific pattern — 'Server-rendered marketing site with search app', not just 'Web application'",
    "description": "How the site is structured. Reference specific HTML elements and class patterns as evidence.",
    "renderingStrategy": "SSR, CSR, SSG, or hybrid — with evidence",
    "layers": [
      {"name": "layer name", "htmlElement": "the actual HTML element/class", "purpose": "what it does"}
    ],
    "keyComponents": [
      {
        "name": "component name",
        "htmlSelector": "CSS selector that identifies this component (e.g., '.universal-search', '#search-tabs')",
        "purpose": "what it does functionally — not just 'displays content'",
        "interactivity": "what user interactions it supports (click, type, hover, drag, etc.)",
        "dependencies": ["CSS framework classes, JS libraries it uses"],
        "complexity": "low|medium|high",
        "dataNeeded": "what data this component needs from the backend"
      }
    ]
  },
  "dataFlow": {
    "description": "Trace a complete user journey — from landing to completing a key action. Be specific.",
    "entryPoints": ["URLs with descriptions"],
    "userJourneys": [
      {"name": "journey name", "steps": ["step 1 with specific UI elements", "step 2", "..."], "apiCalls": ["inferred API calls"]}
    ],
    "dataStores": ["what data this product needs stored — users, content, transactions, etc. Infer from product type."],
    "externalServices": ["detected integrations with evidence (script tags, API calls, link hrefs)"],
    "dataSeeding": "Where would the initial data come from? Mock data, public APIs, scraping, user-generated? This is critical for reproduction."
  },
  "patterns": {
    "designPatterns": ["specific patterns WITH evidence — 'Tab switching via .ui.menu.tabular classes', not just 'tabs'"],
    "conventions": {
      "naming": "specific CSS class naming convention with 3+ examples from the HTML",
      "layout": "layout system used (grid, flexbox, table, float) with evidence from class names",
      "stateManagement": "how client-side state works — JS framework state, URL params, localStorage, or server-rendered",
      "formHandling": "how forms work — action URLs, AJAX, validation approach",
      "styling": "CSS methodology with evidence (BEM classes? Utility classes? Component scoping?)",
      "componentPattern": "how UI components are structured — atomic? compound? with evidence"
    }
  },
  "uiDetails": {
    "layout": {
      "type": "grid/flexbox/table/float with evidence",
      "maxWidth": "detected max-width of main container",
      "structure": "how the page is divided (sidebar + main? full-width sections? centered card?)"
    },
    "colorPalette": {
      "primary": {"hex": "#hex", "usage": "where it's used"},
      "secondary": {"hex": "#hex", "usage": "where"},
      "background": {"hex": "#hex", "usage": "where"},
      "text": {"hex": "rgba or #hex", "usage": "where"},
      "accent": {"hex": "#hex", "usage": "where"},
      "borders": {"hex": "#hex", "usage": "where"},
      "additional": [{"hex": "#hex", "usage": "where"}]
    },
    "typography": {
      "headingFont": "font family for headings with evidence",
      "bodyFont": "font family for body with evidence",
      "scale": {"h1": "size + weight", "h2": "size + weight", "h3": "size + weight", "body": "size + weight", "small": "size + weight"}
    },
    "animations": "specific transitions and effects observed in CSS (transition properties, duration, easing)",
    "responsiveStrategy": {
      "approach": "mobile-first or desktop-first with evidence",
      "breakpoints": ["detected breakpoint values from CSS"],
      "mobileNav": "how navigation changes on mobile",
      "contentReflow": "how content reflows on smaller screens"
    },
    "iconSystem": "icon library with evidence (font files, class names, SVG patterns)",
    "interactionPatterns": [
      {"pattern": "pattern name", "element": "CSS selector", "behavior": "what happens on interaction", "implementation": "how it's likely implemented"}
    ]
  },
  "backendInference": {
    "requiredAPIs": ["list of API endpoints this product would need, inferred from UI"],
    "databaseTables": ["list of database tables needed, inferred from displayed data"],
    "authMethod": "how users likely authenticate — inferred from login forms, session cookies, etc.",
    "searchCapability": "what search features exist and how they'd need to work server-side",
    "dataVolume": "rough estimate of data scale (hundreds, thousands, millions of records)"
  },
  "complexityFactors": [
    "specific technical challenges with evidence — not generic statements"
  ],
  "reproductionChallenges": [
    "what an AI would get WRONG when building this — be specific about which components and why"
  ]
}`;

const WEBSITE_CLAUDE_MD_PROMPT = `Generate a comprehensive CLAUDE.md file for building a replica of the analyzed website. This file will be read by an AI coding agent before it starts building.

CRITICAL: First, figure out what this product/service ACTUALLY DOES from the HTML content, navigation, copy, and features. The CLAUDE.md must cover both the visual design AND the core functionality.

Include ALL of these sections with SPECIFIC values (not placeholders):

1. **Project Overview** — What the product is, what it does (not just "a website"), core features, target users
2. **Product Functionality** — Every feature the product provides. What does a user accomplish here? What data is involved? What backend is needed?
3. **Research Before Building** — Tell the AI to search GitHub for open-source projects in the same product category. Identify the category from the analysis (do NOT hardcode specific project names). Instruct: "Search for 'open source [category]' and study the top results before writing code."
4. **Tech Stack** — Recommended stack based on product complexity (Next.js for full apps, Astro for marketing sites, etc.)
5. **Design System** — EXACT values from the CSS analysis:
   - Every color as a CSS variable with hex value
   - Font families, complete type scale (h1-h6, body, small)
   - Spacing scale, border radius, shadow values
   - Responsive breakpoints with px values
6. **Page Structure** — Every section from top to bottom with layout AND functionality
7. **Component Specs** — For each UI component: appearance, behavior, states
8. **Development Commands** — install, dev, build, test (include Playwright setup)
9. **Testing Strategy** — Playwright E2E tests: install with \`pnpm add -D @playwright/test && npx playwright install chromium\`, write tests during development, run after each phase
10. **Implementation Order** — What to build first, which phases can parallelize with subagents
11. **Gotchas** — Things the AI will get wrong without warning

Rules:
- Identify what the product DOES from its content — adapt to ANY type of website/service
- Use REAL values extracted from the analysis, not generic advice
- Include hex colors, px sizes, font names — everything concrete
- Output ONLY the markdown content, no wrapping`;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limited. Try again in ${rateCheck.retryAfter}s` },
      { status: 429 }
    );
  }

  logRequest({
    timestamp: new Date().toISOString(),
    path: "/api/analyze-website",
    referrer: request.headers.get("referer") || "",
    userAgent: request.headers.get("user-agent") || "",
    ip,
  });

  const body = await request.json();
  const url = body.url as string;

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' field" }, { status: 400 });
  }

  const startTime = Date.now();
  const DEADLINE = 300000; // 5 minutes max

  function checkDeadline() {
    if (Date.now() - startTime > DEADLINE) {
      throw new Error("Analysis timed out after 3 minutes. Try a simpler page.");
    }
  }

  try {
    // Phase 1: Fetch and analyze the website
    const analysis = await analyzeWebsite(url);
    checkDeadline();

    // Phase 2a: Architecture analysis first (detects actual framework)
    const archResult = await callLLM(
      [
        { role: "system", content: WEBSITE_ARCHITECTURE_PROMPT },
        { role: "user", content: analysis.formattedContext },
      ],
      { temperature: 0.2, maxTokens: 6000 }
    );
    checkDeadline();

    // Extract detected framework from architecture
    let detectedFramework = "";
    try {
      let cleaned = archResult.content.trim().replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?\s*```\s*$/m, "");
      const arch = JSON.parse(cleaned);
      detectedFramework = arch.architecture?.description || "";
    } catch {}

    // Phase 2b: Blueprint (informed by architecture detection)
    const frameworkNote = detectedFramework
      ? `\n\nThe architecture analysis detected: "${detectedFramework}". If a specific framework was detected (e.g., Nuxt.js via __nuxt, Next.js via __next), use that framework for the rebuild. Otherwise recommend the most appropriate one.`
      : "";

    const cloneResult = await callLLM(
      [
        { role: "system", content: WEBSITE_CLONE_PROMPT + frameworkNote },
        { role: "user", content: analysis.formattedContext },
      ],
      { temperature: 0.3, maxTokens: 32000 }
    );
    checkDeadline();

    // Phase 2c: CLAUDE.md + IBP in PARALLEL (both informed by blueprint)
    const blueprintSummary = cloneResult.content.slice(0, 3000);
    const ibpContext = `## Blueprint Summary\n${blueprintSummary}\n\n## Website Context\n${analysis.formattedContext.slice(0, 2000)}`;

    const [claudeResult, ibpResult] = await Promise.all([
      callLLM(
        [
          {
            role: "system",
            content: WEBSITE_CLAUDE_MD_PROMPT +
              `\n\nIMPORTANT: The blueprint has already decided the tech stack and design system. You MUST use the SAME choices. Here is the blueprint summary:\n\n${blueprintSummary}`,
          },
          { role: "user", content: analysis.formattedContext },
        ],
        { temperature: 0.2, maxTokens: 8000 }
      ),
      callLLM(
        [
          { role: "system", content: INITIAL_BUILD_PROMPT_GENERATOR },
          { role: "user", content: ibpContext },
        ],
        { temperature: 0.3, maxTokens: 8000 }
      ),
    ]);

    // Parse architecture JSON
    let architecture;
    try {
      let cleaned = archResult.content.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?\s*```\s*$/m, "");
      architecture = JSON.parse(cleaned);
    } catch {
      architecture = {
        overview: archResult.content.slice(0, 200),
        architecture: {
          pattern: "Website",
          description: archResult.content.slice(0, 500),
        },
      };
    }

    // Clean CLAUDE.md
    let claudeMd = claudeResult.content.trim();
    if (claudeMd.startsWith("```")) {
      claudeMd = claudeMd.replace(/^```(?:markdown)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
    }

    // Append IBP to blueprint
    const fullBlueprint = cloneResult.content + "\n\n## Initial Build Prompt\n\n" + ibpResult.content;

    logAnalysis({
      timestamp: new Date().toISOString(),
      inputType: "website",
      input: url,
      projectType: "Website",
      model: cloneResult.model,
      duration: Date.now() - startTime,
      status: "success",
    });

    const responseData = {
      meta: {
        name: analysis.title || url,
        description: analysis.description,
        stars: 0,
        language: null,
        license: null,
      },
      analysis: {
        totalFiles: 0,
        totalDirs: 0,
        maxDepth: 0,
        projectType: "Website Clone",
        isMonorepo: false,
        languages: {},
        filesAnalyzed: analysis.pages.length,
      },
      blueprint: fullBlueprint,
      claudeMd,
      architecture,
      model: cloneResult.model,
    };

    const slug = saveResult(url, "website", responseData);

    return NextResponse.json({
      success: true,
      slug,
      data: responseData,
    });
  } catch (error) {
    logAnalysis({
      timestamp: new Date().toISOString(),
      inputType: "website",
      input: url,
      model: "unknown",
      duration: Date.now() - startTime,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.error("Website analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
