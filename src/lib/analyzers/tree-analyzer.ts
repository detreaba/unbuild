import type { TreeEntry } from "../github/client";

export interface FileClassification {
  source: string[];
  config: string[];
  test: string[];
  docs: string[];
  schema: string[];
  ci: string[];
  assets: string[];
  generated: string[];
  entryPoints: string[];
  packageManifests: string[];
}

export interface TreeAnalysis {
  totalFiles: number;
  totalDirs: number;
  maxDepth: number;
  languages: Map<string, number>;
  classification: FileClassification;
  topLevelDirs: string[];
  projectType: string;
  isMonorepo: boolean;
  formattedTree: string;
}

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb",
  ".php", ".swift", ".kt", ".scala", ".c", ".cpp", ".h", ".hpp",
  ".cs", ".vue", ".svelte", ".astro", ".zig", ".ex", ".exs",
  ".clj", ".cljs", ".ml", ".mli", ".hs", ".elm", ".dart", ".lua",
]);

const CONFIG_FILES = new Set([
  "tsconfig.json", "jsconfig.json", "package.json", "pnpm-workspace.yaml",
  "turbo.json", "nx.json", "lerna.json", ".eslintrc", ".eslintrc.json",
  "eslint.config.js", "eslint.config.mjs", ".prettierrc", "prettier.config.js",
  "tailwind.config.js", "tailwind.config.ts", "postcss.config.js",
  "postcss.config.mjs", "next.config.js", "next.config.ts", "next.config.mjs",
  "vite.config.ts", "vite.config.js", "webpack.config.js",
  "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
  "Makefile", "CMakeLists.txt", ".env.example", ".env.local.example",
  "jest.config.js", "jest.config.ts", "vitest.config.ts",
  "babel.config.js", ".babelrc",
  "Cargo.toml", "go.mod", "go.sum", "requirements.txt",
  "pyproject.toml", "setup.py", "setup.cfg", "Pipfile",
  "Gemfile", "build.gradle", "pom.xml",
  "biome.json", "deno.json", "bun.lockb",
]);

const ENTRY_POINT_PATTERNS = [
  /^src\/(index|main|app)\.(ts|tsx|js|jsx)$/,
  /^(index|main|app)\.(ts|tsx|js|jsx)$/,
  /^src\/app\/(layout|page)\.(ts|tsx|js|jsx)$/,
  /^app\/(layout|page)\.(ts|tsx|js|jsx)$/,
  /^src\/pages\/_app\.(ts|tsx|js|jsx)$/,
  /^(cmd|main)\/main\.go$/,
  /^main\.go$/,
  /^src\/main\.rs$/,
  /^src\/lib\.rs$/,
  /^manage\.py$/,
  /^app\.py$/,
  /^server\.(ts|js)$/,
];

const PACKAGE_MANIFESTS = new Set([
  "package.json", "Cargo.toml", "go.mod", "requirements.txt",
  "pyproject.toml", "Gemfile", "build.gradle", "build.gradle.kts",
  "pom.xml", "setup.py", "setup.cfg", "Pipfile", "composer.json",
  "mix.exs", "pubspec.yaml", "Package.swift",
]);

const SCHEMA_PATTERNS = [
  /prisma\/schema\.prisma$/,
  /schema\.(graphql|gql)$/,
  /\.sql$/,
  /migrations?\//,
  /drizzle\//,
  /openapi\.(json|yaml|yml)$/,
  /swagger\.(json|yaml|yml)$/,
  /\.proto$/,
];

const TEST_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx|py|go|rs)$/,
  /^tests?\//,
  /^__tests__\//,
  /^spec\//,
  /_test\.go$/,
  /test_.*\.py$/,
];

const CI_PATTERNS = [
  /^\.github\/workflows\//,
  /^\.gitlab-ci\.yml$/,
  /^\.circleci\//,
  /^Jenkinsfile$/,
  /^\.travis\.yml$/,
  /^bitbucket-pipelines\.yml$/,
];

const GENERATED_PATTERNS = [
  /\.lock$/,
  /lock\.json$/,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^node_modules\//,
  /\.min\.(js|css)$/,
  /\.d\.ts$/,
  /generated/i,
];

const ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".mp4", ".mp3", ".wav", ".woff", ".woff2", ".ttf", ".eot",
  ".pdf", ".zip", ".tar", ".gz",
]);

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript",
  ".jsx": "JavaScript", ".py": "Python", ".go": "Go", ".rs": "Rust",
  ".java": "Java", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift",
  ".kt": "Kotlin", ".scala": "Scala", ".c": "C", ".cpp": "C++",
  ".cs": "C#", ".vue": "Vue", ".svelte": "Svelte", ".astro": "Astro",
  ".dart": "Dart", ".lua": "Lua", ".zig": "Zig", ".ex": "Elixir",
  ".exs": "Elixir", ".clj": "Clojure", ".hs": "Haskell", ".elm": "Elm",
};

function getExtension(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot).toLowerCase() : "";
}

function getFileName(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function classifyFile(path: string): keyof FileClassification | null {
  const ext = getExtension(path);
  const name = getFileName(path);

  if (GENERATED_PATTERNS.some((p) => p.test(path))) return "generated";
  if (CI_PATTERNS.some((p) => p.test(path))) return "ci";
  if (TEST_PATTERNS.some((p) => p.test(path))) return "test";
  if (SCHEMA_PATTERNS.some((p) => p.test(path))) return "schema";
  if (PACKAGE_MANIFESTS.has(name)) return "packageManifests";
  if (CONFIG_FILES.has(name)) return "config";
  if (ENTRY_POINT_PATTERNS.some((p) => p.test(path))) return "entryPoints";
  if (ASSET_EXTENSIONS.has(ext)) return "assets";
  if (path.endsWith(".md") || path.endsWith(".txt") || path.endsWith(".rst"))
    return "docs";
  if (SOURCE_EXTENSIONS.has(ext)) return "source";
  if (CONFIG_FILES.has(name) || ext === ".json" || ext === ".yaml" || ext === ".yml" || ext === ".toml")
    return "config";
  return null;
}

export function analyzeTree(entries: TreeEntry[]): TreeAnalysis {
  const blobs = entries.filter((e) => e.type === "blob");
  const dirs = entries.filter((e) => e.type === "tree");

  const classification: FileClassification = {
    source: [], config: [], test: [], docs: [], schema: [],
    ci: [], assets: [], generated: [], entryPoints: [], packageManifests: [],
  };

  const languages = new Map<string, number>();
  let maxDepth = 0;

  for (const blob of blobs) {
    const depth = blob.path.split("/").length;
    if (depth > maxDepth) maxDepth = depth;

    const ext = getExtension(blob.path);
    const lang = EXT_TO_LANG[ext];
    if (lang) {
      languages.set(lang, (languages.get(lang) || 0) + (blob.size || 1));
    }

    const cls = classifyFile(blob.path);
    if (cls) {
      classification[cls].push(blob.path);
    }

    // Also check entry points even if already classified
    if (ENTRY_POINT_PATTERNS.some((p) => p.test(blob.path))) {
      if (!classification.entryPoints.includes(blob.path)) {
        classification.entryPoints.push(blob.path);
      }
    }
  }

  const topLevelDirs = dirs
    .filter((d) => !d.path.includes("/"))
    .map((d) => d.path)
    .sort();

  const isMonorepo =
    topLevelDirs.includes("packages") ||
    topLevelDirs.includes("apps") ||
    blobs.some(
      (b) =>
        b.path === "pnpm-workspace.yaml" ||
        b.path === "lerna.json" ||
        b.path === "turbo.json" ||
        b.path === "nx.json"
    );

  const projectType = detectProjectType(classification, topLevelDirs, blobs);

  // Build formatted tree (smart depth: show more for important dirs)
  const formattedTree = formatSmartTree(entries, topLevelDirs);

  return {
    totalFiles: blobs.length,
    totalDirs: dirs.length,
    maxDepth,
    languages,
    classification,
    topLevelDirs,
    projectType,
    isMonorepo,
    formattedTree,
  };
}

function detectProjectType(
  cls: FileClassification,
  topDirs: string[],
  blobs: TreeEntry[]
): string {
  const hasFile = (name: string) => blobs.some((b) => b.path === name);
  const types: string[] = [];

  if (
    hasFile("next.config.js") ||
    hasFile("next.config.ts") ||
    hasFile("next.config.mjs")
  )
    types.push("Next.js App");
  else if (hasFile("nuxt.config.ts") || hasFile("nuxt.config.js"))
    types.push("Nuxt App");
  else if (hasFile("vite.config.ts") || hasFile("vite.config.js"))
    types.push("Vite App");
  else if (hasFile("angular.json")) types.push("Angular App");
  else if (hasFile("svelte.config.js")) types.push("SvelteKit App");
  else if (hasFile("astro.config.mjs")) types.push("Astro App");

  if (hasFile("Dockerfile") || hasFile("docker-compose.yml"))
    types.push("Dockerized");
  if (hasFile("Cargo.toml")) types.push("Rust Project");
  if (hasFile("go.mod")) types.push("Go Project");
  if (hasFile("manage.py")) types.push("Django App");
  if (hasFile("requirements.txt") || hasFile("pyproject.toml"))
    types.push("Python Project");

  if (topDirs.includes("packages") || topDirs.includes("apps"))
    types.push("Monorepo");

  if (cls.schema.length > 0) types.push("Database-backed");

  return types.length > 0 ? types.join(" / ") : "Software Project";
}

function formatSmartTree(entries: TreeEntry[], topDirs: string[]): string {
  // Show depth 3 for important dirs, depth 2 for others, depth 1 for generated
  const importantDirs = new Set([
    "src", "app", "lib", "api", "components", "pages", "routes",
    "server", "client", "core", "modules", "features", "services",
    "prisma", "drizzle", "schema", "models", "types",
  ]);
  const shallowDirs = new Set([
    "node_modules", "dist", "build", ".next", ".git",
    "coverage", "__pycache__", "target", "vendor",
  ]);

  const lines: string[] = [];
  const processed = new Set<string>();

  // Sort entries: dirs first, then files
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split("/");
    const depth = parts.length;
    const topDir = parts[0];

    // Skip deeply nested files based on directory importance
    if (shallowDirs.has(topDir)) continue;

    let maxAllowedDepth = 2;
    if (importantDirs.has(topDir)) maxAllowedDepth = 4;
    else if (topDirs.includes(topDir)) maxAllowedDepth = 3;

    if (depth > maxAllowedDepth) continue;

    // Avoid duplicate directory entries
    const key = entry.path;
    if (processed.has(key)) continue;
    processed.add(key);

    const indent = "  ".repeat(depth - 1);
    const name = parts[parts.length - 1];
    const suffix = entry.type === "tree" ? "/" : "";
    lines.push(`${indent}${name}${suffix}`);
  }

  // Limit to 200 lines for sanity
  if (lines.length > 200) {
    return lines.slice(0, 200).join("\n") + "\n... (truncated)";
  }
  return lines.join("\n");
}

/**
 * Select the most important files to read from the repo.
 * Returns paths prioritized by importance for understanding the architecture.
 */
export function selectKeyFiles(
  analysis: TreeAnalysis,
  maxFiles: number = 30
): string[] {
  const selected: string[] = [];
  const cls = analysis.classification;

  // Priority 1: Package manifests (critical for understanding dependencies)
  // Only root-level and first-level package manifests
  for (const p of cls.packageManifests) {
    if (p.split("/").length <= 2 && selected.length < maxFiles) {
      selected.push(p);
    }
  }

  // Priority 2: Entry points
  for (const p of cls.entryPoints) {
    if (selected.length < maxFiles && !selected.includes(p)) {
      selected.push(p);
    }
  }

  // Priority 3: Schema files (DB, API, types)
  for (const p of cls.schema) {
    if (selected.length < maxFiles && !selected.includes(p)) {
      selected.push(p);
    }
  }

  // Priority 4: Config files (build, lint, CI)
  const importantConfigs = cls.config.filter((p) => {
    const name = getFileName(p);
    return [
      "tsconfig.json", "next.config.ts", "next.config.js", "next.config.mjs",
      "vite.config.ts", "docker-compose.yml", "Dockerfile",
      ".env.example", "turbo.json",
      "Cargo.toml", "go.mod", "pyproject.toml",
    ].includes(name);
  });
  for (const p of importantConfigs) {
    if (selected.length < maxFiles && !selected.includes(p)) {
      selected.push(p);
    }
  }

  // Priority 5: CI configs
  for (const p of cls.ci.slice(0, 2)) {
    if (selected.length < maxFiles && !selected.includes(p)) {
      selected.push(p);
    }
  }

  // Priority 6: README
  const readmePaths = cls.docs.filter((p) =>
    /^readme\.md$/i.test(getFileName(p))
  );
  for (const p of readmePaths.slice(0, 1)) {
    if (selected.length < maxFiles && !selected.includes(p)) {
      selected.push(p);
    }
  }

  // Priority 7: Key source files - pick representative files from each major dir
  const dirSamples = new Map<string, string[]>();
  for (const p of cls.source) {
    const topDir = p.split("/")[0];
    if (!dirSamples.has(topDir)) dirSamples.set(topDir, []);
    dirSamples.get(topDir)!.push(p);
  }

  // Pick up to 2 files per top-level source directory
  for (const [, files] of dirSamples) {
    // Prefer shorter paths (more likely to be important/architectural)
    const sorted = files.sort((a, b) => a.split("/").length - b.split("/").length);
    for (const p of sorted.slice(0, 2)) {
      if (selected.length < maxFiles && !selected.includes(p)) {
        selected.push(p);
      }
    }
  }

  return selected;
}
