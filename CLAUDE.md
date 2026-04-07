@AGENTS.md

# UnBuild

Universal reverse engineering tool. Analyzes GitHub repos, websites, products, APIs, and plain text — produces implementation blueprints, CLAUDE.md files, and Initial Build Prompts for any AI coding tool.

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Framer Motion
- Playwright (browser rendering for website analysis)
- Multi-provider LLM (OpenAI, Anthropic, OpenRouter, Google, Ollama, Claude Code CLI)
- JSON file database (no external DB)
- Vitest (57 unit tests)

## Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm test` — run unit tests
- `pnpm lint` — ESLint
- `pnpm build:cli` — build CLI tool

## Architecture
- `src/lib/analyzers/` — Input detection, tree/website/product/universal analyzers
- `src/lib/generators/` — Multi-pass LLM blueprint generation (architecture → blueprint → CLAUDE.md → IBP)
- `src/lib/llm/` — Provider abstraction (6 providers) + system prompts
- `src/lib/admin/` — Auth (JWT), JSON store, types
- `src/app/api/analyze/` — GitHub repo pipeline
- `src/app/api/analyze-website/` — Website pipeline (Playwright + 3 LLM calls)
- `src/app/api/analyze-universal/` — Product/API/text pipeline
- `src/app/admin/` — Admin panel UI
- `src/app/r/[slug]/` — Shareable result pages
- `cli/` — Standalone CLI (zero deps beyond Node builtins)

## Key Patterns
- LLM calls are sequential where needed (architecture → blueprint) and parallel where possible (CLAUDE.md + IBP)
- Website analyzer tries Playwright first, falls back to HTTP fetch
- All fetch calls have 10s AbortController timeout
- Website pipeline has 300s overall deadline
- Chain of Verification prepended to every LLM prompt
- IBP is always a separate LLM call (never generated inside the blueprint)
- Admin keys loaded at runtime from JSON store, with env vars as fallback
