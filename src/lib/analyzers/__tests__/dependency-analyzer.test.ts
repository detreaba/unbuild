import { describe, it, expect } from "vitest";
import {
  analyzePackageJson,
  analyzeCargoToml,
  analyzeGoMod,
  analyzePyProject,
} from "../dependency-analyzer";

describe("analyzePackageJson", () => {
  it("detects Next.js framework", () => {
    const pkg = JSON.stringify({
      dependencies: { next: "14.0.0", react: "18.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.frameworks).toContain("Next.js");
    expect(result.frameworks).toContain("React");
  });

  it("detects Prisma database", () => {
    const pkg = JSON.stringify({
      dependencies: { "@prisma/client": "5.0.0" },
      devDependencies: { prisma: "5.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.databases.some((d) => d.includes("Prisma"))).toBe(true);
  });

  it("detects Clerk auth", () => {
    const pkg = JSON.stringify({
      dependencies: { "@clerk/nextjs": "4.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.authProviders).toContain("Clerk");
  });

  it("detects Zustand state management", () => {
    const pkg = JSON.stringify({
      dependencies: { zustand: "4.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.stateManagement).toContain("Zustand");
  });

  it("detects Tailwind CSS", () => {
    const pkg = JSON.stringify({
      devDependencies: { tailwindcss: "3.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.css).toContain("Tailwind CSS");
  });

  it("detects Vitest testing", () => {
    const pkg = JSON.stringify({
      devDependencies: { vitest: "1.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.testing).toContain("Vitest");
  });

  it("detects Stripe API", () => {
    const pkg = JSON.stringify({
      dependencies: { stripe: "14.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.apis).toContain("Stripe");
  });

  it("detects tRPC API", () => {
    const pkg = JSON.stringify({
      dependencies: { "@trpc/server": "10.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.apis).toContain("tRPC");
  });

  it("handles empty package.json", () => {
    const result = analyzePackageJson("{}");
    expect(result.runtime).toEqual([]);
    expect(result.dev).toEqual([]);
    expect(result.frameworks).toEqual([]);
  });

  it("handles malformed JSON", () => {
    const result = analyzePackageJson("not json");
    expect(result.runtime).toEqual([]);
  });

  it("lists runtime dependencies", () => {
    const pkg = JSON.stringify({
      dependencies: { react: "18.0.0", next: "14.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.runtime.length).toBe(2);
    expect(result.runtime[0].name).toBe("react");
    expect(result.runtime[0].version).toBe("18.0.0");
  });

  it("detects Vercel deployment", () => {
    const pkg = JSON.stringify({
      dependencies: { "@vercel/analytics": "1.0.0" },
    });
    const result = analyzePackageJson(pkg);
    expect(result.deployment).toContain("Vercel");
  });
});

describe("analyzeCargoToml", () => {
  it("detects Axum framework", () => {
    const toml = `[dependencies]\naxum = "0.7"\ntokio = { version = "1", features = ["full"] }`;
    const result = analyzeCargoToml(toml);
    expect(result.frameworks).toContain("Axum");
  });

  it("detects SQLx database", () => {
    const toml = `[dependencies]\nsqlx = { version = "0.7", features = ["postgres"] }`;
    const result = analyzeCargoToml(toml);
    expect(result.databases).toContain("SQLx");
  });
});

describe("analyzeGoMod", () => {
  it("detects Gin framework", () => {
    const gomod = `module example.com/app\nrequire github.com/gin-gonic/gin v1.9.0`;
    const result = analyzeGoMod(gomod);
    expect(result.frameworks).toContain("Gin");
  });

  it("detects GORM database", () => {
    const gomod = `module example.com/app\nrequire gorm.io/gorm v1.25.0`;
    const result = analyzeGoMod(gomod);
    expect(result.databases).toContain("GORM");
  });
});

describe("analyzePyProject", () => {
  it("detects FastAPI framework", () => {
    const toml = `[project]\nname = "app"\ndependencies = ["fastapi>=0.100"]`;
    const result = analyzePyProject(toml);
    expect(result.frameworks).toContain("FastAPI");
  });

  it("detects Django framework", () => {
    const toml = `[project]\ndependencies = ["django>=4.2"]`;
    const result = analyzePyProject(toml);
    expect(result.frameworks).toContain("Django");
  });
});
