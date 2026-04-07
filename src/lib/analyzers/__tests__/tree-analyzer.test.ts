import { describe, it, expect } from "vitest";
import { analyzeTree, selectKeyFiles } from "../tree-analyzer";
import type { TreeEntry } from "../../github/client";

function makeEntry(
  path: string,
  type: "blob" | "tree" = "blob",
  size = 100
): TreeEntry {
  return { path, type, mode: "100644", sha: "abc123", size };
}

describe("analyzeTree", () => {
  it("counts files and directories", () => {
    const entries: TreeEntry[] = [
      makeEntry("src", "tree"),
      makeEntry("src/index.ts"),
      makeEntry("src/utils.ts"),
      makeEntry("package.json"),
    ];
    const result = analyzeTree(entries);
    expect(result.totalFiles).toBe(3);
    expect(result.totalDirs).toBe(1);
  });

  it("classifies source files", () => {
    const entries: TreeEntry[] = [
      makeEntry("src", "tree"),
      makeEntry("src/helper.ts"),
      makeEntry("src/utils.py"),
      makeEntry("src/render.tsx"),
    ];
    const result = analyzeTree(entries);
    expect(result.classification.source).toContain("src/helper.ts");
    expect(result.classification.source).toContain("src/utils.py");
    expect(result.classification.source).toContain("src/render.tsx");
  });

  it("classifies config files", () => {
    const entries: TreeEntry[] = [
      makeEntry("package.json"),
      makeEntry("tsconfig.json"),
      makeEntry("next.config.ts"),
    ];
    const result = analyzeTree(entries);
    expect(result.classification.packageManifests).toContain("package.json");
  });

  it("classifies test files", () => {
    const entries: TreeEntry[] = [
      makeEntry("src/app.test.ts"),
      makeEntry("tests/unit.spec.tsx"),
      makeEntry("__tests__/foo.ts"),
    ];
    const result = analyzeTree(entries);
    expect(result.classification.test.length).toBeGreaterThanOrEqual(2);
  });

  it("classifies schema files", () => {
    const entries: TreeEntry[] = [
      makeEntry("prisma/schema.prisma"),
      makeEntry("schema.graphql"),
    ];
    const result = analyzeTree(entries);
    expect(result.classification.schema.length).toBe(2);
  });

  it("classifies CI files", () => {
    const entries: TreeEntry[] = [
      makeEntry(".github", "tree"),
      makeEntry(".github/workflows", "tree"),
      makeEntry(".github/workflows/ci.yml"),
    ];
    const result = analyzeTree(entries);
    expect(result.classification.ci).toContain(".github/workflows/ci.yml");
  });

  it("detects entry points", () => {
    const entries: TreeEntry[] = [
      makeEntry("src", "tree"),
      makeEntry("src/index.ts"),
      makeEntry("src/app", "tree"),
      makeEntry("src/app/layout.tsx"),
      makeEntry("src/app/page.tsx"),
    ];
    const result = analyzeTree(entries);
    expect(result.classification.entryPoints.length).toBeGreaterThanOrEqual(1);
  });

  it("detects languages", () => {
    const entries: TreeEntry[] = [
      makeEntry("app.ts", "blob", 5000),
      makeEntry("main.py", "blob", 3000),
      makeEntry("lib.rs", "blob", 2000),
    ];
    const result = analyzeTree(entries);
    expect(result.languages.get("TypeScript")).toBe(5000);
    expect(result.languages.get("Python")).toBe(3000);
    expect(result.languages.get("Rust")).toBe(2000);
  });

  it("detects monorepo from packages dir", () => {
    const entries: TreeEntry[] = [
      makeEntry("packages", "tree"),
      makeEntry("packages/core", "tree"),
      makeEntry("packages/core/index.ts"),
    ];
    const result = analyzeTree(entries);
    expect(result.isMonorepo).toBe(true);
  });

  it("detects monorepo from turbo.json", () => {
    const entries: TreeEntry[] = [makeEntry("turbo.json"), makeEntry("src", "tree")];
    const result = analyzeTree(entries);
    expect(result.isMonorepo).toBe(true);
  });

  it("detects Next.js project type", () => {
    const entries: TreeEntry[] = [
      makeEntry("next.config.ts"),
      makeEntry("package.json"),
    ];
    const result = analyzeTree(entries);
    expect(result.projectType).toContain("Next.js");
  });

  it("detects Go project type", () => {
    const entries: TreeEntry[] = [makeEntry("go.mod"), makeEntry("main.go")];
    const result = analyzeTree(entries);
    expect(result.projectType).toContain("Go");
  });

  it("calculates max depth", () => {
    const entries: TreeEntry[] = [
      makeEntry("a", "tree"),
      makeEntry("a/b", "tree"),
      makeEntry("a/b/c", "tree"),
      makeEntry("a/b/c/file.ts"),
    ];
    const result = analyzeTree(entries);
    expect(result.maxDepth).toBe(4);
  });
});

describe("selectKeyFiles", () => {
  it("prioritizes package manifests", () => {
    const entries: TreeEntry[] = [
      makeEntry("package.json"),
      makeEntry("src", "tree"),
      makeEntry("src/index.ts"),
      makeEntry("src/foo.ts"),
    ];
    const analysis = analyzeTree(entries);
    const selected = selectKeyFiles(analysis, 5);
    expect(selected[0]).toBe("package.json");
  });

  it("includes entry points", () => {
    const entries: TreeEntry[] = [
      makeEntry("src", "tree"),
      makeEntry("src/index.ts"),
      makeEntry("src/other.ts"),
    ];
    const analysis = analyzeTree(entries);
    const selected = selectKeyFiles(analysis);
    expect(selected).toContain("src/index.ts");
  });

  it("respects maxFiles limit", () => {
    const entries: TreeEntry[] = Array.from({ length: 100 }, (_, i) =>
      makeEntry(`src/file${i}.ts`)
    );
    entries.push(makeEntry("src", "tree"));
    const analysis = analyzeTree(entries);
    const selected = selectKeyFiles(analysis, 5);
    expect(selected.length).toBeLessThanOrEqual(5);
  });
});
