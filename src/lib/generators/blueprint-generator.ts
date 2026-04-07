import type { TreeAnalysis } from "../analyzers/tree-analyzer";
import type { DependencyAnalysis } from "../analyzers/dependency-analyzer";
import { callLLM } from "../llm/provider";
import {
  ARCHITECTURE_ANALYSIS_PROMPT,
  CLAUDE_MD_PROMPT,
  BLUEPRINT_PROMPT,
} from "../llm/prompts/architecture-prompt";
import { INITIAL_BUILD_PROMPT_GENERATOR } from "../llm/prompts/ibp-prompt";

export interface Blueprint {
  architectureAnalysis: ArchitectureAnalysis;
  claudeMd: string;
  blueprint: string;
  metadata: {
    owner: string;
    repo: string;
    analyzedAt: string;
    filesAnalyzed: number;
    totalFiles: number;
    model: string;
  };
}

export interface ArchitectureAnalysis {
  overview: string;
  architecture: {
    pattern: string;
    description: string;
    layers: string[];
    keyComponents: {
      name: string;
      path: string;
      purpose: string;
      dependencies: string[];
      complexity: string;
    }[];
  };
  dataFlow: {
    description: string;
    entryPoints: string[];
    dataStores: string[];
    externalServices: string[];
    flow: string[];
  };
  patterns: {
    designPatterns: string[];
    conventions: Record<string, string>;
  };
  complexityFactors: string[];
  criticalFiles: { path: string; why: string }[];
}

function buildContextMessage(
  owner: string,
  repo: string,
  tree: TreeAnalysis,
  deps: DependencyAnalysis | null,
  fileContents: Map<string, string>,
  readme: string | null
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Repository: ${owner}/${repo}`);
  sections.push(
    `**Total files:** ${tree.totalFiles} | **Dirs:** ${tree.totalDirs} | **Max depth:** ${tree.maxDepth}`
  );
  sections.push(`**Project type:** ${tree.projectType}`);
  sections.push(`**Monorepo:** ${tree.isMonorepo}`);

  // Languages
  if (tree.languages.size > 0) {
    const sorted = [...tree.languages.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sections.push(
      `**Languages:** ${sorted.map(([lang, bytes]) => `${lang} (${formatBytes(bytes)})`).join(", ")}`
    );
  }

  // File tree
  sections.push("\n## File Tree (smart depth)");
  sections.push("```");
  sections.push(tree.formattedTree);
  sections.push("```");

  // File classification summary
  const cls = tree.classification;
  sections.push("\n## File Classification");
  sections.push(`- Source files: ${cls.source.length}`);
  sections.push(`- Config files: ${cls.config.length}`);
  sections.push(`- Test files: ${cls.test.length}`);
  sections.push(`- Schema files: ${cls.schema.length}`);
  sections.push(`- CI/CD files: ${cls.ci.length}`);
  sections.push(`- Documentation: ${cls.docs.length}`);
  sections.push(`- Entry points: ${cls.entryPoints.join(", ") || "none detected"}`);

  // Dependencies
  if (deps) {
    sections.push("\n## Dependencies Analysis");
    if (deps.frameworks.length) sections.push(`**Frameworks:** ${deps.frameworks.join(", ")}`);
    if (deps.databases.length) sections.push(`**Databases:** ${deps.databases.join(", ")}`);
    if (deps.authProviders.length) sections.push(`**Auth:** ${deps.authProviders.join(", ")}`);
    if (deps.stateManagement.length) sections.push(`**State:** ${deps.stateManagement.join(", ")}`);
    if (deps.testing.length) sections.push(`**Testing:** ${deps.testing.join(", ")}`);
    if (deps.css.length) sections.push(`**CSS/UI:** ${deps.css.join(", ")}`);
    if (deps.apis.length) sections.push(`**APIs/Services:** ${deps.apis.join(", ")}`);
    if (deps.buildTools.length) sections.push(`**Build tools:** ${deps.buildTools.join(", ")}`);
    if (deps.deployment.length) sections.push(`**Deployment:** ${deps.deployment.join(", ")}`);
    if (deps.notable.length) sections.push(`**Notable libs:** ${deps.notable.join(", ")}`);

    // Full runtime deps list
    if (deps.runtime.length > 0) {
      sections.push("\n### Runtime Dependencies");
      for (const d of deps.runtime.slice(0, 60)) {
        sections.push(`- ${d.name}: ${d.version}`);
      }
      if (deps.runtime.length > 60) {
        sections.push(`... and ${deps.runtime.length - 60} more`);
      }
    }
  }

  // File contents
  if (fileContents.size > 0) {
    sections.push("\n## Key File Contents");
    for (const [path, content] of fileContents) {
      // Truncate individual files to 4000 chars
      const truncated =
        content.length > 4000
          ? content.slice(0, 4000) + "\n... (truncated)"
          : content;
      const ext = path.split(".").pop() || "";
      sections.push(`\n### ${path}`);
      sections.push(`\`\`\`${ext}`);
      sections.push(truncated);
      sections.push("```");
    }
  }

  // README
  if (readme) {
    sections.push("\n## README");
    // Allow more README content than GitReverse
    const truncated =
      readme.length > 20000
        ? readme.slice(0, 20000) + "\n... (truncated)"
        : readme;
    sections.push(truncated);
  }

  return sections.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export async function generateBlueprint(
  owner: string,
  repo: string,
  tree: TreeAnalysis,
  deps: DependencyAnalysis | null,
  fileContents: Map<string, string>,
  readme: string | null
): Promise<Blueprint> {
  const context = buildContextMessage(owner, repo, tree, deps, fileContents, readme);

  // Phase 1: Architecture analysis (JSON)
  const archResult = await callLLM(
    [
      { role: "system", content: ARCHITECTURE_ANALYSIS_PROMPT },
      { role: "user", content: context },
    ],
    { temperature: 0.2, maxTokens: 8000 }
  );

  let architectureAnalysis: ArchitectureAnalysis;
  try {
    // Strip any markdown code fences if present
    let cleaned = archResult.content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    architectureAnalysis = JSON.parse(cleaned);
  } catch {
    // If JSON parsing fails, create a minimal analysis
    architectureAnalysis = {
      overview: "Analysis could not be parsed. See blueprint for details.",
      architecture: {
        pattern: tree.projectType,
        description: "",
        layers: [],
        keyComponents: [],
      },
      dataFlow: {
        description: "",
        entryPoints: [],
        dataStores: [],
        externalServices: [],
        flow: [],
      },
      patterns: { designPatterns: [], conventions: {} },
      complexityFactors: [],
      criticalFiles: [],
    };
  }

  // Phase 2: Generate CLAUDE.md and Blueprint in parallel
  const enrichedContext =
    context +
    "\n\n## Architecture Analysis (from Phase 1)\n" +
    JSON.stringify(architectureAnalysis, null, 2);

  const [claudeMdResult, blueprintResult] = await Promise.all([
    callLLM(
      [
        { role: "system", content: CLAUDE_MD_PROMPT },
        { role: "user", content: enrichedContext },
      ],
      { temperature: 0.2, maxTokens: 8000 }
    ),
    callLLM(
      [
        { role: "system", content: BLUEPRINT_PROMPT },
        { role: "user", content: enrichedContext },
      ],
      { temperature: 0.3, maxTokens: 16000 }
    ),
  ]);

  // Phase 3: Generate Initial Build Prompt (informed by blueprint + CLAUDE.md)
  const ibpContext = `## Blueprint Summary\n${blueprintResult.content.slice(0, 3000)}\n\n## CLAUDE.md Summary\n${claudeMdResult.content.slice(0, 2000)}`;
  const ibpResult = await callLLM(
    [
      { role: "system", content: INITIAL_BUILD_PROMPT_GENERATOR },
      { role: "user", content: ibpContext },
    ],
    { temperature: 0.3, maxTokens: 8000 }
  );

  // Append IBP to blueprint
  const fullBlueprint = blueprintResult.content + "\n\n## Initial Build Prompt\n\n" + ibpResult.content;

  return {
    architectureAnalysis,
    claudeMd: claudeMdResult.content,
    blueprint: fullBlueprint,
    metadata: {
      owner,
      repo,
      analyzedAt: new Date().toISOString(),
      filesAnalyzed: fileContents.size,
      totalFiles: tree.totalFiles,
      model: archResult.model,
    },
  };
}
