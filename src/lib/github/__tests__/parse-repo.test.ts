import { describe, it, expect } from "vitest";
import { parseGitHubInput } from "../parse-repo";

describe("parseGitHubInput", () => {
  it("parses full GitHub URL", () => {
    expect(parseGitHubInput("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("parses URL without protocol", () => {
    expect(parseGitHubInput("github.com/facebook/react")).toEqual({
      owner: "facebook",
      repo: "react",
    });
  });

  it("parses URL with www", () => {
    expect(parseGitHubInput("https://www.github.com/supabase/supabase")).toEqual({
      owner: "supabase",
      repo: "supabase",
    });
  });

  it("strips .git suffix", () => {
    expect(parseGitHubInput("https://github.com/vercel/next.js.git")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("parses owner/repo format", () => {
    expect(parseGitHubInput("vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("handles URL with hash fragment", () => {
    expect(
      parseGitHubInput("https://github.com/vercel/next.js#readme")
    ).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("handles URL with query params", () => {
    expect(
      parseGitHubInput("https://github.com/vercel/next.js?tab=readme")
    ).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("trims whitespace", () => {
    expect(parseGitHubInput("  vercel/next.js  ")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("throws on invalid input", () => {
    expect(() => parseGitHubInput("not-a-repo")).toThrow("Invalid input");
  });

  it("throws on empty string", () => {
    expect(() => parseGitHubInput("")).toThrow("Invalid input");
  });

  it("throws on single word", () => {
    expect(() => parseGitHubInput("vercel")).toThrow("Invalid input");
  });
});
