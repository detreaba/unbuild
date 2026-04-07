#!/usr/bin/env node

/**
 * UnBuild CLI
 *
 * Usage:
 *   npx unbuild-dev <owner/repo>
 *   npx unbuild-dev https://github.com/vercel/next.js
 *   npx unbuild-dev vercel/next.js --output ./blueprint
 *   npx unbuild-dev vercel/next.js --claude-md-only
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---- Minimal color helpers (no deps) ----
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

// ---- Parse args ----
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
${c.bold("UnBuild")} — Deep reverse engineering for GitHub repos

${c.bold("Usage:")}
  npx unbuild-dev <owner/repo or github-url> [options]

${c.bold("Options:")}
  --output, -o <dir>    Output directory (default: current dir)
  --claude-md-only      Only generate CLAUDE.md
  --blueprint-only      Only generate the implementation blueprint
  --json                Output architecture analysis as JSON
  --model <model>       LLM model to use (default: anthropic/claude-sonnet-4)
  --help, -h            Show this help

${c.bold("Environment:")}
  OPENROUTER_API_KEY    OpenRouter API key (recommended)
  ANTHROPIC_API_KEY     Anthropic API key (alternative)
  OPENAI_API_KEY        OpenAI API key (alternative)
  GITHUB_TOKEN          GitHub token for higher rate limits

${c.bold("Examples:")}
  npx unbuild-dev vercel/next.js
  npx unbuild-dev https://github.com/supabase/supabase -o ./analysis
  npx unbuild-dev shadcn-ui/ui --claude-md-only
`);
  process.exit(0);
}

// Parse flags
let repoInput = "";
let outputDir = ".";
let claudeMdOnly = false;
let blueprintOnly = false;
let jsonOutput = false;
let model: string | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--output" || arg === "-o") {
    outputDir = args[++i] || ".";
  } else if (arg === "--claude-md-only") {
    claudeMdOnly = true;
  } else if (arg === "--blueprint-only") {
    blueprintOnly = true;
  } else if (arg === "--json") {
    jsonOutput = true;
  } else if (arg === "--model") {
    model = args[++i];
  } else if (!arg.startsWith("-")) {
    repoInput = arg;
  }
}

if (!repoInput) {
  console.error(c.red("Error: No repository specified."));
  process.exit(1);
}

// ---- GitHub API helpers ----
const GITHUB_API = "https://api.github.com";

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "unbuild-cli",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function ghFetch<T>(urlPath: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${urlPath}`, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${urlPath}`);
  return res.json() as Promise<T>;
}

async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch: string
): Promise<string | null> {
  try {
    const data = await ghFetch<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
    );
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return data.content;
  } catch {
    return null;
  }
}

// ---- Repo parsing ----
function parseRepo(input: string): { owner: string; repo: string } {
  const urlMatch = input.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
  const slashMatch = input.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
  throw new Error(`Invalid repo: "${input}"`);
}

// ---- LLM call ----
async function callLLM(
  messages: { role: string; content: string }[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY;

  // No API key? Use Claude Code CLI (uses subscription via stdin pipe)
  if (!apiKey) {
    const parts: string[] = [];
    for (const msg of messages) {
      if (msg.role === "system") parts.push(`<system>\n${msg.content}\n</system>`);
      else if (msg.role === "user") parts.push(msg.content);
      else parts.push(`<assistant>\n${msg.content}\n</assistant>`);
    }
    const prompt = parts.join("\n\n");

    return new Promise<string>((resolve, reject) => {
      const { spawn } = require("child_process") as typeof import("child_process");
      const child = spawn("claude", ["-p", "--bare", "--output-format", "text"], {
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      child.on("close", (code: number) => {
        if (code !== 0) {
          reject(new Error(`Claude Code exited ${code}: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });

      child.on("error", (err: Error) => reject(err));

      // Write prompt to stdin and close it
      child.stdin.write(prompt);
      child.stdin.end();

      // Timeout after 5 minutes
      setTimeout(() => {
        child.kill();
        reject(new Error("Claude Code timed out after 5 minutes"));
      }, 300000);
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "anthropic/claude-sonnet-4",
        messages,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 16000,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const system = messages.find((m) => m.role === "system")?.content || "";
    const nonSystem = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        system,
        messages: nonSystem,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 16000,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }

  // OpenAI fallback
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 16000,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ---- File classification (simplified for CLI) ----
const SOURCE_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb",
  ".php", ".swift", ".kt", ".c", ".cpp", ".cs", ".vue", ".svelte",
]);

const CONFIG_NAMES = new Set([
  "package.json", "tsconfig.json", "next.config.ts", "next.config.js",
  "next.config.mjs", "vite.config.ts", "docker-compose.yml", "Dockerfile",
  "Cargo.toml", "go.mod", "pyproject.toml", "requirements.txt",
  ".env.example", "turbo.json", "pnpm-workspace.yaml",
]);

const ENTRY_PATTERNS = [
  /^src\/(index|main|app)\.(ts|tsx|js|jsx)$/,
  /^(index|main|app)\.(ts|tsx|js|jsx)$/,
  /^src\/app\/(layout|page)\.(ts|tsx|js|jsx)$/,
  /^app\/(layout|page)\.(ts|tsx|js|jsx)$/,
  /^main\.go$/,
  /^src\/main\.rs$/,
  /^manage\.py$/,
];

const SCHEMA_PATTERNS = [
  /prisma\/schema\.prisma$/,
  /\.sql$/,
  /schema\.(graphql|gql)$/,
  /drizzle\//,
  /openapi\.(json|yaml|yml)$/,
];

function selectKeyFiles(
  tree: { path: string; type: string }[],
  maxFiles = 25
): string[] {
  const blobs = tree.filter((e) => e.type === "blob");
  const selected: string[] = [];

  // Configs
  for (const b of blobs) {
    const name = b.path.split("/").pop() || "";
    if (CONFIG_NAMES.has(name) && b.path.split("/").length <= 2) {
      if (selected.length < maxFiles) selected.push(b.path);
    }
  }

  // Entry points
  for (const b of blobs) {
    if (ENTRY_PATTERNS.some((p) => p.test(b.path))) {
      if (selected.length < maxFiles && !selected.includes(b.path)) selected.push(b.path);
    }
  }

  // Schemas
  for (const b of blobs) {
    if (SCHEMA_PATTERNS.some((p) => p.test(b.path))) {
      if (selected.length < maxFiles && !selected.includes(b.path)) selected.push(b.path);
    }
  }

  // Sample source files
  const dirs = new Map<string, string[]>();
  for (const b of blobs) {
    const ext = b.path.includes(".") ? "." + b.path.split(".").pop() : "";
    if (!SOURCE_EXT.has(ext)) continue;
    const top = b.path.split("/")[0];
    if (!dirs.has(top)) dirs.set(top, []);
    dirs.get(top)!.push(b.path);
  }
  for (const [, files] of dirs) {
    const sorted = files.sort((a, b) => a.split("/").length - b.split("/").length);
    for (const f of sorted.slice(0, 2)) {
      if (selected.length < maxFiles && !selected.includes(f)) selected.push(f);
    }
  }

  return selected;
}

// ---- System prompts ----
const CLAUDE_MD_PROMPT = `You are generating a CLAUDE.md file for a software project. Based on the repository analysis, generate a comprehensive CLAUDE.md that would allow an AI coding agent to effectively work on this project.

Include: Project overview, tech stack, project structure, development commands, code conventions, architecture notes, environment variables, testing strategy, common patterns, and gotchas.

Rules:
- Be SPECIFIC to this project
- Reference actual file paths
- Include actual commands
- Focus on what's non-obvious
- Output ONLY the markdown content`;

const BLUEPRINT_PROMPT = `You are an expert AI coding architect. Create a comprehensive implementation blueprint for recreating this project.

The blueprint must include:
1. Project DNA (type, architecture, complexity, technologies)
2. Initial Prompt (500-1500 words that a developer would paste into Claude Code)
3. Implementation Phases with:
   - Which phases can run in parallel with multiple agents
   - Specific agent skills needed (terminal, file-write, web-search)
   - Exact commands and file paths
   - Validation steps after each phase
4. Data Model (if applicable)
5. API Surface (if applicable)
6. Environment Variables
7. Key Implementation Details (non-obvious logic, edge cases)
8. Testing Strategy

Format as structured markdown. Be comprehensive enough that an AI agent can recreate 90%+ of the project.`;

// ---- Main ----
async function main() {
  const { owner, repo } = parseRepo(repoInput);
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let spinIdx = 0;
  const spin = setInterval(() => {
    process.stdout.write(
      `\r${c.blue(spinner[spinIdx++ % spinner.length])} Analyzing...`
    );
  }, 100);

  function log(msg: string) {
    clearInterval(spin);
    console.log(`\r${c.green("✓")} ${msg}`);
  }

  try {
    // Step 1: Fetch metadata
    const meta = await ghFetch<{
      full_name: string;
      description: string;
      default_branch: string;
      stargazers_count: number;
      language: string;
    }>(`/repos/${owner}/${repo}`);
    log(`Repository: ${c.bold(meta.full_name)} (${meta.stargazers_count.toLocaleString()} stars)`);

    // Step 2: Fetch tree
    process.stdout.write(`${c.dim("  Fetching file tree...")}`);
    const treeData = await ghFetch<{ tree: { path: string; type: string; size?: number }[] }>(
      `/repos/${owner}/${repo}/git/trees/${meta.default_branch}?recursive=1`
    );
    const blobs = treeData.tree.filter((e) => e.type === "blob");
    log(`File tree: ${blobs.length} files`);

    // Step 3: Select and fetch key files
    const keyFiles = selectKeyFiles(treeData.tree);
    process.stdout.write(`${c.dim(`  Reading ${keyFiles.length} key files...`)}`);

    const fileContents = new Map<string, string>();
    for (let i = 0; i < keyFiles.length; i += 10) {
      const batch = keyFiles.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(async (p) => {
          const content = await fetchFileContent(owner, repo, p, meta.default_branch);
          return [p, content] as const;
        })
      );
      for (const [p, content] of results) {
        if (content) fileContents.set(p, content);
      }
    }
    log(`Read ${fileContents.size} files`);

    // Fetch README
    let readme: string | null = null;
    for (const rp of ["README.md", "readme.md"]) {
      if (treeData.tree.some((e) => e.path === rp)) {
        readme = await fetchFileContent(owner, repo, rp, meta.default_branch);
        if (readme) break;
      }
    }

    // Step 4: Build context
    const contextParts: string[] = [];
    contextParts.push(`# Repository: ${owner}/${repo}`);
    contextParts.push(`**Description:** ${meta.description || "N/A"}`);
    contextParts.push(`**Language:** ${meta.language || "N/A"}`);
    contextParts.push(`**Stars:** ${meta.stargazers_count}`);
    contextParts.push(`**Files:** ${blobs.length}`);

    // Build tree display (depth 3)
    const treeLines: string[] = [];
    const skipDirs = new Set(["node_modules", "dist", "build", ".next", ".git", "vendor", "target"]);
    for (const entry of treeData.tree) {
      const parts = entry.path.split("/");
      if (skipDirs.has(parts[0])) continue;
      if (parts.length > 3) continue;
      const indent = "  ".repeat(parts.length - 1);
      const name = parts[parts.length - 1];
      treeLines.push(`${indent}${name}${entry.type === "tree" ? "/" : ""}`);
    }
    contextParts.push("\n## File Tree\n```\n" + treeLines.slice(0, 200).join("\n") + "\n```");

    // File contents
    contextParts.push("\n## Key File Contents");
    for (const [filePath, content] of fileContents) {
      const ext = filePath.split(".").pop() || "";
      const truncated = content.length > 4000 ? content.slice(0, 4000) + "\n... (truncated)" : content;
      contextParts.push(`\n### ${filePath}\n\`\`\`${ext}\n${truncated}\n\`\`\``);
    }

    if (readme) {
      const truncated = readme.length > 20000 ? readme.slice(0, 20000) + "\n... (truncated)" : readme;
      contextParts.push("\n## README\n" + truncated);
    }

    const context = contextParts.join("\n");

    // Step 5: Generate outputs
    if (!claudeMdOnly) {
      process.stdout.write(`${c.dim("  Generating blueprint (this may take 30-60s)...")}`);
      const blueprint = await callLLM(
        [
          { role: "system", content: BLUEPRINT_PROMPT },
          { role: "user", content: context },
        ],
        { temperature: 0.3, maxTokens: 16000 }
      );
      log("Blueprint generated");

      const bpPath = path.join(outputDir, `${repo}-blueprint.md`);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(bpPath, blueprint, "utf-8");
      console.log(`  ${c.dim("→")} ${c.cyan(bpPath)}`);
    }

    if (!blueprintOnly) {
      process.stdout.write(`${c.dim("  Generating CLAUDE.md...")}`);
      const claudeMd = await callLLM(
        [
          { role: "system", content: CLAUDE_MD_PROMPT },
          { role: "user", content: context },
        ],
        { temperature: 0.2, maxTokens: 8000 }
      );
      log("CLAUDE.md generated");

      const cmdPath = path.join(outputDir, "CLAUDE.md");
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(cmdPath, claudeMd, "utf-8");
      console.log(`  ${c.dim("→")} ${c.cyan(cmdPath)}`);
    }

    if (jsonOutput) {
      // Also output architecture analysis
      process.stdout.write(`${c.dim("  Generating architecture analysis...")}`);
      const archPrompt = `Analyze this codebase and output a JSON object with: overview, architecture (pattern, layers, keyComponents), dataFlow, patterns, complexityFactors, criticalFiles. No markdown, just valid JSON.`;
      const arch = await callLLM(
        [
          { role: "system", content: archPrompt },
          { role: "user", content: context },
        ],
        { temperature: 0.2, maxTokens: 8000 }
      );
      log("Architecture analysis generated");

      const archPath = path.join(outputDir, `${repo}-architecture.json`);
      fs.writeFileSync(archPath, arch, "utf-8");
      console.log(`  ${c.dim("→")} ${c.cyan(archPath)}`);
    }

    console.log(`\n${c.green("Done!")} ${c.dim(`Analyzed ${owner}/${repo}`)}`);
  } catch (err) {
    clearInterval(spin);
    console.error(`\n${c.red("Error:")} ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
