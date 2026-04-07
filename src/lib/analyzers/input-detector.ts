import type { InputType } from "./analyzer-types";

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();

  // GitHub repo: URL or owner/repo format
  if (trimmed.match(/github\.com\/[^/\s]+\/[^/\s]+/)) return "github-repo";
  // owner/repo format: exactly one slash, no protocol, no spaces
  // Allow dots in repo name (e.g., next.js) — exclude TLD-like patterns (.com, .org, .io)
  if (trimmed.match(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/) && !trimmed.match(/\.(com|org|net|io|dev|app|co|me|info|xyz)$/i))
    return "github-repo";

  // API spec: OpenAPI, Swagger, or spec file URLs
  if (
    trimmed.match(
      /swagger\.|openapi|api-docs|petstore|\.json$|\.yaml$|\.yml$/i
    )
  )
    return "api-spec";

  // Product URL: e-commerce sites, product pages
  if (
    trimmed.match(
      /amazon\.|ebay\.|aliexpress\.|etsy\.|walmart\.|bestbuy\.|newegg\.|banggood\.|gearbest\.|thingiverse\.|grabcad\./i
    )
  )
    return "product";

  // Also detect product pages by URL patterns
  if (trimmed.match(/\/product[s]?\//i) || trimmed.match(/\/dp\//i) || trimmed.match(/\/item\//i))
    return "product";

  // Website: any URL with protocol or domain
  if (trimmed.match(/^https?:\/\//)) return "website";
  if (trimmed.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/|$)/)) return "website";

  // Text description: long text with spaces
  if (trimmed.length > 100 && trimmed.includes(" ")) return "text";

  return "unknown";
}

export function getLoadingStages(type: InputType): string[] {
  switch (type) {
    case "github-repo":
      return [
        "Fetching repository metadata...",
        "Analyzing file tree structure...",
        "Reading key source files...",
        "Analyzing dependencies...",
        "Detecting architecture patterns...",
        "Generating CLAUDE.md...",
        "Building implementation blueprint...",
        "Running chain of verification...",
        "Finalizing analysis...",
      ];
    case "website":
      return [
        "Fetching website HTML...",
        "Extracting page structure...",
        "Analyzing CSS & design tokens...",
        "Crawling internal pages...",
        "Mapping product functionality...",
        "Analyzing visual design system...",
        "Generating replication blueprint...",
        "Running chain of verification...",
        "Finalizing analysis...",
      ];
    case "product":
      return [
        "Fetching product page...",
        "Extracting specifications...",
        "Identifying components & materials...",
        "Researching similar open-source projects...",
        "Generating bill of materials...",
        "Creating assembly instructions...",
        "Running chain of verification...",
        "Finalizing analysis...",
      ];
    case "api-spec":
      return [
        "Fetching API specification...",
        "Parsing endpoints & schemas...",
        "Mapping authentication patterns...",
        "Generating integration guide...",
        "Running chain of verification...",
        "Finalizing analysis...",
      ];
    case "text":
    case "unknown":
    default:
      return [
        "Analyzing input...",
        "Identifying what to reverse engineer...",
        "Researching similar projects...",
        "Generating blueprint...",
        "Running chain of verification...",
        "Finalizing analysis...",
      ];
  }
}
