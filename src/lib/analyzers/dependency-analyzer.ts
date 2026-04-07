export interface DependencyAnalysis {
  runtime: DependencyInfo[];
  dev: DependencyInfo[];
  frameworks: string[];
  databases: string[];
  authProviders: string[];
  stateManagement: string[];
  testing: string[];
  buildTools: string[];
  css: string[];
  deployment: string[];
  apis: string[];
  notable: string[];
}

interface DependencyInfo {
  name: string;
  version: string;
  category: string;
}

const FRAMEWORK_PATTERNS: Record<string, string> = {
  next: "Next.js",
  nuxt: "Nuxt.js",
  "@angular/core": "Angular",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  astro: "Astro",
  react: "React",
  vue: "Vue.js",
  express: "Express",
  fastify: "Fastify",
  hono: "Hono",
  "nestjs/core": "NestJS",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  "ruby-on-rails": "Rails",
  gin: "Gin",
  axum: "Axum",
  actix: "Actix",
  "spring-boot": "Spring Boot",
  remix: "Remix",
  gatsby: "Gatsby",
  "t3-oss": "T3 Stack",
};

const DB_PATTERNS: Record<string, string> = {
  prisma: "Prisma ORM",
  "@prisma/client": "Prisma",
  drizzle: "Drizzle ORM",
  "drizzle-orm": "Drizzle ORM",
  typeorm: "TypeORM",
  sequelize: "Sequelize",
  mongoose: "Mongoose/MongoDB",
  mongodb: "MongoDB",
  pg: "PostgreSQL",
  mysql2: "MySQL",
  redis: "Redis",
  ioredis: "Redis",
  "@supabase/supabase-js": "Supabase",
  firebase: "Firebase",
  "@firebase/firestore": "Firebase Firestore",
  convex: "Convex",
  "@planetscale/database": "PlanetScale",
  "@neondatabase/serverless": "Neon",
  "better-sqlite3": "SQLite",
  sqlite3: "SQLite",
  knex: "Knex.js",
  kysely: "Kysely",
};

const AUTH_PATTERNS: Record<string, string> = {
  "next-auth": "NextAuth.js",
  "@auth/core": "Auth.js",
  "@clerk/nextjs": "Clerk",
  clerk: "Clerk",
  "@supabase/auth-helpers-nextjs": "Supabase Auth",
  "passport": "Passport.js",
  "@lucia-auth/core": "Lucia Auth",
  "lucia-auth": "Lucia Auth",
  "better-auth": "Better Auth",
  firebase: "Firebase Auth",
  "@kinde-oss/kinde-auth-nextjs": "Kinde",
  auth0: "Auth0",
};

const STATE_PATTERNS: Record<string, string> = {
  zustand: "Zustand",
  "@reduxjs/toolkit": "Redux Toolkit",
  redux: "Redux",
  jotai: "Jotai",
  recoil: "Recoil",
  mobx: "MobX",
  "@tanstack/react-query": "TanStack Query",
  swr: "SWR",
  valtio: "Valtio",
  xstate: "XState",
};

const TEST_PATTERNS: Record<string, string> = {
  jest: "Jest",
  vitest: "Vitest",
  "@testing-library/react": "React Testing Library",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  cypress: "Cypress",
  mocha: "Mocha",
  chai: "Chai",
  "pytest": "pytest",
  supertest: "Supertest",
};

const CSS_PATTERNS: Record<string, string> = {
  tailwindcss: "Tailwind CSS",
  "styled-components": "Styled Components",
  "@emotion/react": "Emotion",
  "sass": "Sass",
  "@mantine/core": "Mantine UI",
  "@chakra-ui/react": "Chakra UI",
  "@mui/material": "Material UI",
  "antd": "Ant Design",
  "shadcn": "shadcn/ui",
  "@radix-ui/react-dialog": "Radix UI",
  "class-variance-authority": "CVA (likely shadcn/ui)",
  "clsx": "clsx",
};

const API_PATTERNS: Record<string, string> = {
  trpc: "tRPC",
  "@trpc/server": "tRPC",
  graphql: "GraphQL",
  "@apollo/server": "Apollo GraphQL",
  "apollo-server": "Apollo GraphQL",
  openai: "OpenAI API",
  "@anthropic-ai/sdk": "Anthropic/Claude API",
  stripe: "Stripe",
  "@stripe/stripe-js": "Stripe",
  resend: "Resend Email",
  "@sendgrid/mail": "SendGrid",
  "aws-sdk": "AWS SDK",
  "@aws-sdk/client-s3": "AWS S3",
  "socket.io": "Socket.IO",
  ws: "WebSocket",
};

function matchPatterns(
  deps: Record<string, string>,
  patterns: Record<string, string>
): string[] {
  const matched: string[] = [];
  for (const [key, label] of Object.entries(patterns)) {
    for (const dep of Object.keys(deps)) {
      if (dep === key || dep.includes(key)) {
        if (!matched.includes(label)) matched.push(label);
      }
    }
  }
  return matched;
}

export function analyzePackageJson(content: string): DependencyAnalysis {
  try {
    const pkg = JSON.parse(content);
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const allDeps = { ...deps, ...devDeps };

    const runtime: DependencyInfo[] = Object.entries(deps).map(
      ([name, version]) => ({
        name,
        version: version as string,
        category: "runtime",
      })
    );

    const dev: DependencyInfo[] = Object.entries(devDeps).map(
      ([name, version]) => ({
        name,
        version: version as string,
        category: "dev",
      })
    );

    return {
      runtime,
      dev,
      frameworks: matchPatterns(allDeps, FRAMEWORK_PATTERNS),
      databases: matchPatterns(allDeps, DB_PATTERNS),
      authProviders: matchPatterns(allDeps, AUTH_PATTERNS),
      stateManagement: matchPatterns(allDeps, STATE_PATTERNS),
      testing: matchPatterns(allDeps, TEST_PATTERNS),
      buildTools: detectBuildTools(pkg),
      css: matchPatterns(allDeps, CSS_PATTERNS),
      deployment: detectDeployment(pkg),
      apis: matchPatterns(allDeps, API_PATTERNS),
      notable: detectNotable(allDeps),
    };
  } catch {
    return emptyAnalysis();
  }
}

function detectBuildTools(pkg: Record<string, unknown>): string[] {
  const tools: string[] = [];
  const allDeps = {
    ...(pkg.dependencies as Record<string, string> || {}),
    ...(pkg.devDependencies as Record<string, string> || {}),
  };

  if ("turbo" in allDeps || "turbo.json" in allDeps) tools.push("Turborepo");
  if ("esbuild" in allDeps) tools.push("esbuild");
  if ("rollup" in allDeps) tools.push("Rollup");
  if ("webpack" in allDeps) tools.push("Webpack");
  if ("tsup" in allDeps) tools.push("tsup");
  if ("unbuild" in allDeps) tools.push("unbuild");

  const scripts = pkg.scripts as Record<string, string> | undefined;
  if (scripts) {
    const scriptStr = Object.values(scripts).join(" ");
    if (scriptStr.includes("tsc")) tools.push("TypeScript Compiler");
    if (scriptStr.includes("pnpm")) tools.push("pnpm");
    if (scriptStr.includes("bun")) tools.push("Bun");
  }

  return tools;
}

function detectDeployment(pkg: Record<string, unknown>): string[] {
  const deploy: string[] = [];
  const allDeps = {
    ...(pkg.dependencies as Record<string, string> || {}),
    ...(pkg.devDependencies as Record<string, string> || {}),
  };

  if ("vercel" in allDeps || "@vercel/analytics" in allDeps) deploy.push("Vercel");
  if ("@netlify/functions" in allDeps) deploy.push("Netlify");
  if ("wrangler" in allDeps) deploy.push("Cloudflare Workers");

  return deploy;
}

function detectNotable(deps: Record<string, string>): string[] {
  const notable: string[] = [];
  const patterns: Record<string, string> = {
    zod: "Zod (schema validation)",
    "@tanstack/react-table": "TanStack Table",
    "@tanstack/react-router": "TanStack Router",
    "date-fns": "date-fns",
    dayjs: "Day.js",
    lodash: "Lodash",
    "framer-motion": "Framer Motion",
    i18next: "i18next (internationalization)",
    sharp: "Sharp (image processing)",
    "uploadthing": "UploadThing",
    cron: "Cron jobs",
    bullmq: "BullMQ (job queues)",
    "socket.io": "Socket.IO (real-time)",
  };

  for (const [key, label] of Object.entries(patterns)) {
    if (key in deps && !notable.includes(label)) {
      notable.push(label);
    }
  }
  return notable;
}

export function analyzeCargoToml(content: string): Partial<DependencyAnalysis> {
  // Basic TOML parsing for Cargo.toml
  const deps: string[] = [];
  const lines = content.split("\n");
  let inDeps = false;

  for (const line of lines) {
    if (line.match(/^\[dependencies\]/)) { inDeps = true; continue; }
    if (line.match(/^\[/)) { inDeps = false; continue; }
    if (inDeps) {
      const match = line.match(/^(\S+)\s*=/);
      if (match) deps.push(match[1]);
    }
  }

  const frameworks: string[] = [];
  const databases: string[] = [];
  if (deps.includes("axum") || deps.includes("actix-web") || deps.includes("rocket"))
    frameworks.push(deps.includes("axum") ? "Axum" : deps.includes("actix-web") ? "Actix" : "Rocket");
  if (deps.includes("tokio")) frameworks.push("Tokio (async runtime)");
  if (deps.includes("sqlx")) databases.push("SQLx");
  if (deps.includes("diesel")) databases.push("Diesel ORM");
  if (deps.includes("sea-orm")) databases.push("SeaORM");

  return { frameworks, databases };
}

export function analyzeGoMod(content: string): Partial<DependencyAnalysis> {
  const frameworks: string[] = [];
  const databases: string[] = [];

  if (content.includes("github.com/gin-gonic/gin")) frameworks.push("Gin");
  if (content.includes("github.com/gofiber/fiber")) frameworks.push("Fiber");
  if (content.includes("github.com/labstack/echo")) frameworks.push("Echo");
  if (content.includes("github.com/gorilla/mux")) frameworks.push("Gorilla Mux");
  if (content.includes("gorm.io/gorm")) databases.push("GORM");
  if (content.includes("github.com/jackc/pgx")) databases.push("pgx (PostgreSQL)");
  if (content.includes("go.mongodb.org/mongo-driver")) databases.push("MongoDB");

  return { frameworks, databases };
}

export function analyzePyProject(content: string): Partial<DependencyAnalysis> {
  const frameworks: string[] = [];
  const databases: string[] = [];

  if (content.includes("fastapi")) frameworks.push("FastAPI");
  if (content.includes("django")) frameworks.push("Django");
  if (content.includes("flask")) frameworks.push("Flask");
  if (content.includes("sqlalchemy")) databases.push("SQLAlchemy");
  if (content.includes("tortoise")) databases.push("Tortoise ORM");
  if (content.includes("prisma")) databases.push("Prisma");

  return { frameworks, databases };
}

function emptyAnalysis(): DependencyAnalysis {
  return {
    runtime: [], dev: [], frameworks: [], databases: [],
    authProviders: [], stateManagement: [], testing: [],
    buildTools: [], css: [], deployment: [], apis: [], notable: [],
  };
}
