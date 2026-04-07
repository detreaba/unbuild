import { NextRequest, NextResponse } from "next/server";
import { parseGitHubInput } from "@/lib/github/parse-repo";
import {
  fetchRepoMeta,
  fetchTree,
  fetchFileContent,
  fetchMultipleFiles,
} from "@/lib/github/client";
import { analyzeTree, selectKeyFiles } from "@/lib/analyzers/tree-analyzer";
import {
  analyzePackageJson,
  analyzeCargoToml,
  analyzeGoMod,
  analyzePyProject,
  type DependencyAnalysis,
} from "@/lib/analyzers/dependency-analyzer";
import { generateBlueprint } from "@/lib/generators/blueprint-generator";
import { logAnalysis, checkRateLimit, logRequest, saveResult } from "@/lib/admin/store";

// In-flight dedup
const inFlight = new Map<string, Promise<Response>>();

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limited. Try again in ${rateCheck.retryAfter}s` },
      { status: 429 }
    );
  }

  // Track request
  logRequest({
    timestamp: new Date().toISOString(),
    path: "/api/analyze",
    referrer: request.headers.get("referer") || "",
    userAgent: request.headers.get("user-agent") || "",
    ip,
  });

  const body = await request.json();
  const input = body.repo as string;

  if (!input) {
    return NextResponse.json({ error: "Missing 'repo' field" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseGitHubInput(input);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }

  const key = `${parsed.owner}/${parsed.repo}`;

  // Dedup concurrent requests
  if (inFlight.has(key)) {
    return inFlight.get(key)!;
  }

  const promise = doAnalysis(parsed.owner, parsed.repo);
  inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

async function doAnalysis(owner: string, repo: string): Promise<Response> {
  const startTime = Date.now();
  try {
    // Phase 1: Fetch repo metadata and tree in parallel
    const [meta, tree] = await Promise.all([
      fetchRepoMeta(owner, repo),
      fetchRepoMeta(owner, repo).then((m) => fetchTree(owner, repo, m.default_branch)),
    ]);

    // Phase 2: Analyze tree structure
    const treeAnalysis = analyzeTree(tree);

    // Phase 3: Select key files and fetch them
    const keyFiles = selectKeyFiles(treeAnalysis);

    // Always try to fetch README
    const readmePaths = ["README.md", "readme.md", "README.rst", "README"];
    let readme: string | null = null;
    for (const rp of readmePaths) {
      if (tree.some((e) => e.path === rp)) {
        readme = await fetchFileContent(owner, repo, rp, meta.default_branch);
        if (readme) break;
      }
    }

    // Fetch all key files
    const fileContents = await fetchMultipleFiles(
      owner,
      repo,
      keyFiles.filter((f) => !readmePaths.includes(f)),
      meta.default_branch
    );

    // Phase 4: Dependency analysis
    let deps: DependencyAnalysis | null = null;
    const pkgJson = fileContents.get("package.json");
    if (pkgJson) {
      deps = analyzePackageJson(pkgJson);
    }
    const cargoToml = fileContents.get("Cargo.toml");
    if (cargoToml) {
      const rustDeps = analyzeCargoToml(cargoToml);
      if (!deps) deps = { runtime: [], dev: [], frameworks: [], databases: [], authProviders: [], stateManagement: [], testing: [], buildTools: [], css: [], deployment: [], apis: [], notable: [] };
      if (rustDeps.frameworks) deps.frameworks.push(...rustDeps.frameworks);
      if (rustDeps.databases) deps.databases.push(...rustDeps.databases);
    }
    const goMod = fileContents.get("go.mod");
    if (goMod) {
      const goDeps = analyzeGoMod(goMod);
      if (!deps) deps = { runtime: [], dev: [], frameworks: [], databases: [], authProviders: [], stateManagement: [], testing: [], buildTools: [], css: [], deployment: [], apis: [], notable: [] };
      if (goDeps.frameworks) deps.frameworks.push(...goDeps.frameworks);
      if (goDeps.databases) deps.databases.push(...goDeps.databases);
    }
    const pyProject = fileContents.get("pyproject.toml");
    if (pyProject) {
      const pyDeps = analyzePyProject(pyProject);
      if (!deps) deps = { runtime: [], dev: [], frameworks: [], databases: [], authProviders: [], stateManagement: [], testing: [], buildTools: [], css: [], deployment: [], apis: [], notable: [] };
      if (pyDeps.frameworks) deps.frameworks.push(...pyDeps.frameworks);
      if (pyDeps.databases) deps.databases.push(...pyDeps.databases);
    }

    // Phase 5: Generate blueprint via LLM
    const blueprint = await generateBlueprint(
      owner,
      repo,
      treeAnalysis,
      deps,
      fileContents,
      readme
    );

    // Log success
    logAnalysis({
      timestamp: new Date().toISOString(),
      inputType: "repo",
      input: `${owner}/${repo}`,
      projectType: treeAnalysis.projectType,
      filesAnalyzed: blueprint.metadata.filesAnalyzed,
      totalFiles: treeAnalysis.totalFiles,
      model: blueprint.metadata.model,
      duration: Date.now() - startTime,
      status: "success",
      tokensUsed: undefined, // TODO: track from LLM response
    });

    const responseData = {
      meta: {
        name: meta.full_name,
        description: meta.description,
        stars: meta.stargazers_count,
        language: meta.language,
        license: meta.license?.spdx_id,
      },
      analysis: {
        totalFiles: treeAnalysis.totalFiles,
        totalDirs: treeAnalysis.totalDirs,
        maxDepth: treeAnalysis.maxDepth,
        projectType: treeAnalysis.projectType,
        isMonorepo: treeAnalysis.isMonorepo,
        languages: Object.fromEntries(treeAnalysis.languages),
        filesAnalyzed: blueprint.metadata.filesAnalyzed,
      },
      blueprint: blueprint.blueprint,
      claudeMd: blueprint.claudeMd,
      architecture: blueprint.architectureAnalysis,
      model: blueprint.metadata.model,
    };

    // Save for shareable link
    const slug = saveResult(`${owner}/${repo}`, "repo", responseData);

    return NextResponse.json({
      success: true,
      slug,
      data: responseData,
    });
  } catch (error) {
    // Log error
    logAnalysis({
      timestamp: new Date().toISOString(),
      inputType: "repo",
      input: `${owner}/${repo}`,
      model: "unknown",
      duration: Date.now() - startTime,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.error("Analysis error:", error);
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
