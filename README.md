# UnBuild

**Reverse engineer anything.**

Paste a GitHub repo, website URL, product page, API spec, or describe any idea in plain text. UnBuild deep-analyzes it and produces everything an AI coding tool needs to rebuild it from scratch.

**Live at [unbuild.tech](https://unbuild.tech)**

## What you get

Every analysis produces four deliverables:

| Output | What it is |
|--------|-----------|
| **Implementation Blueprint** | Multi-phase build plan with parallel agent decomposition, data models, API endpoints, and validation steps. 2000-4000 words. |
| **CLAUDE.md** | Production-ready AI agent config — design system, dev commands, component specs, and product-specific gotchas. 800-2000 words. |
| **Initial Build Prompt** | The single prompt you paste into any AI tool (Claude Code, Cursor, Codex, Windsurf). Tells the AI to research, plan, build, and test. 800-1100 words. |
| **Architecture Analysis** | Evidence-based JSON — detected tech, component graph, user journeys, reproduction challenges. |

## What you can analyze

- **GitHub repos** — Full codebase analysis with file tree, dependencies, architecture patterns
- **Websites** — Renders with Playwright (real browser), extracts design system, infers backend
- **Product pages** — Component teardown, bill of materials, open-source alternatives
- **API specs** — Endpoint catalog, schema definitions, integration guide
- **Plain text ideas** — Describe anything, get a researched blueprint with tech stack and build phases

## Quick start

### Web

Visit [unbuild.tech](https://unbuild.tech), paste your input, get results.

Every analysis creates a shareable link (e.g., `unbuild.tech/r/craigslist-org`) you can revisit or share with your AI coding tool.

### CLI

```bash
npx unbuild-dev vercel/next.js
npx unbuild-dev https://stripe.com
npx unbuild-dev --help
```

### Self-hosting

```bash
git clone https://github.com/detreaba/unbuild
cd unbuild
pnpm install
cp .env.example .env.local
# Add your API key to .env.local
npx playwright install chromium
pnpm dev
```

## How it works

1. **Fetch & Extract** — Uses Playwright (real Chrome browser) to render pages, read source code, and extract CSS/HTML structure
2. **Understand the Product** — Chain of Verification ensures every claim is evidence-based. Identifies what the product DOES, not just what it looks like
3. **Architect the Build** — Three separate LLM passes: architecture analysis (JSON) → implementation blueprint → CLAUDE.md
4. **Generate the Prompt** — Dedicated LLM call produces the Initial Build Prompt, informed by both the blueprint and CLAUDE.md

## Admin panel

Self-hosted instances include a full admin panel at `/admin`:

- **API Keys** — Add/test/rotate keys for OpenAI, Anthropic, OpenRouter, Google, Ollama
- **Model Selection** — Choose model, temperature, max tokens
- **History** — Every analysis logged with timing, status, and model used
- **Rate Limiting** — Per-IP throttling with allowlist
- **Analytics** — Usage stats, referrers, error rates

## LLM providers

UnBuild works with any LLM provider. Set one in `.env.local`:

| Provider | Env var | Default model |
|----------|---------|---------------|
| OpenAI | `OPENAI_API_KEY` | gpt-4.1 |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4 |
| OpenRouter | `OPENROUTER_API_KEY` | anthropic/claude-sonnet-4 |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | gemini-2.5-pro |
| Ollama (local) | `OLLAMA_URL` | llama3.1 |

No API key? Falls back to Claude Code CLI (uses your subscription).

## Environment variables

```env
# LLM (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=

# GitHub (recommended — 60 → 5000 req/hr)
GITHUB_TOKEN=

# Admin panel
ADMIN_PASSWORD=change-me

# Optional
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + Framer Motion
- **Browser automation:** Playwright (renders JS-heavy sites)
- **LLM:** Multi-provider abstraction (6 providers)
- **Auth:** JWT sessions with password-based admin login
- **Storage:** JSON file database (no external DB required)
- **Testing:** Vitest (57 unit tests)

## Project structure

```
src/
  app/
    api/
      analyze/            — GitHub repo analysis pipeline
      analyze-website/    — Website analysis pipeline (Playwright)
      analyze-universal/  — Product, API, text analysis pipeline
      admin/              — Admin API (keys, config, history, analytics)
      results/[slug]/     — Shareable result API
    admin/                — Admin panel UI
    r/[slug]/             — Shareable result pages
  components/
    sections/             — Landing page sections
    tool/                 — Analysis tool UI (input, loading, results)
    layout/               — Navbar, footer
    ui/                   — Reusable components
  lib/
    analyzers/            — Input detection, tree analysis, website/product parsing
    generators/           — Multi-pass LLM blueprint generation
    llm/                  — Provider abstraction + system prompts
    admin/                — Auth, data store, types
cli/                      — Standalone CLI tool
```

## Contributing

Contributions welcome. Open an issue first to discuss what you'd like to change.

## License

MIT
