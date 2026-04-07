export const EXAMPLE_INPUTS = [
  { name: "Next.js", input: "vercel/next.js", type: "repo" },
  { name: "Stripe.com", input: "https://stripe.com", type: "website" },
  { name: "shadcn/ui", input: "shadcn-ui/ui", type: "repo" },
  { name: "Linear.app", input: "https://linear.app", type: "website" },
  { name: "Build a Figma clone", input: "I want to build a collaborative design tool like Figma with real-time multiplayer editing, vector graphics engine, component systems, and plugin ecosystem", type: "text" },
] as const;

export const LOADING_STAGES = [
  "Fetching repository metadata...",
  "Analyzing file tree structure...",
  "Reading key source files...",
  "Analyzing dependencies...",
  "Detecting architecture patterns...",
  "Generating CLAUDE.md...",
  "Building implementation blueprint...",
  "Finalizing analysis...",
] as const;

export const COMPARISON_FEATURES = [
  { feature: "Reads actual source code", us: true, gitreverse: false, repomix: true },
  { feature: "Architecture analysis", us: true, gitreverse: false, repomix: false },
  { feature: "CLAUDE.md generation", us: true, gitreverse: false, repomix: false },
  { feature: "Multi-agent task decomposition", us: true, gitreverse: false, repomix: false },
  { feature: "Dependency analysis", us: true, gitreverse: false, repomix: false },
  { feature: "Implementation phases", us: true, gitreverse: false, repomix: false },
  { feature: "Validation steps", us: true, gitreverse: false, repomix: false },
  { feature: "Smart file selection", us: true, gitreverse: false, repomix: false },
  { feature: "CLI support", us: true, gitreverse: false, repomix: true },
] as const;

export const FEATURES = [
  {
    title: "Deep Source Analysis",
    description: "Reads actual source code, configs, schemas, and entry points. Not just the README.",
    icon: "Layers" as const,
  },
  {
    title: "CLAUDE.md Generation",
    description: "Production-ready AI agent configuration with conventions, commands, and gotchas.",
    icon: "FileCode" as const,
  },
  {
    title: "Multi-Agent Decomposition",
    description: "Splits implementation into parallelizable tasks with agent skill recommendations.",
    icon: "Users" as const,
  },
  {
    title: "Architecture Detection",
    description: "Identifies design patterns, component relationships, and data flow automatically.",
    icon: "LayoutGrid" as const,
  },
  {
    title: "Dependency Mapping",
    description: "Categorizes all dependencies: frameworks, databases, auth, state, testing, APIs.",
    icon: "Package" as const,
  },
  {
    title: "Smart File Selection",
    description: "Prioritizes the files that matter most for understanding architecture.",
    icon: "FileSearch" as const,
  },
  {
    title: "Implementation Phases",
    description: "Ordered build phases with dependency tracking and exact commands.",
    icon: "ListChecks" as const,
  },
  {
    title: "Validation Steps",
    description: "Each phase includes verification steps to ensure correctness before proceeding.",
    icon: "ShieldCheck" as const,
  },
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    title: "Reconnaissance",
    description: "Full recursive file tree analysis with classification — source, config, test, schema, CI/CD, assets. Detects project type and monorepo patterns.",
    icon: "Search" as const,
  },
  {
    title: "Deep Analysis",
    description: "Reads actual source files, package manifests, schemas, and entry points. Analyzes all dependencies and their categories.",
    icon: "Code" as const,
  },
  {
    title: "Architecture Inference",
    description: "Detects design patterns, component relationships, data flow, and complexity factors using multi-pass LLM analysis.",
    icon: "Network" as const,
  },
  {
    title: "Blueprint Generation",
    description: "Produces a multi-phase implementation plan with agent task decomposition, CLAUDE.md, and validation steps.",
    icon: "FileText" as const,
  },
] as const;
