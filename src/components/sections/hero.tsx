"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { EXAMPLE_INPUTS } from "@/lib/constants";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const PREVIEW_LINES = [
  "# Blueprint: vercel/next.js",
  "",
  "## Project DNA",
  "- **Type:** Full-stack React framework",
  "- **Architecture:** Monorepo (Turborepo)",
  "- **Complexity:** 9/10",
  "- **Estimated Files:** 8,500+",
  "",
  "## Implementation Phases",
  "",
  "### Phase 1: Foundation",
  "**Agents:** 1 (sequential)",
  "**Skills:** terminal, file-write",
  "",
  "1. Initialize monorepo with Turborepo",
  "2. Configure workspace packages...",
  "",
  "### Phase 2: Core Compiler (3 agents)",
  "#### Agent 2a: SWC Transform Pipeline",
  "#### Agent 2b: Route Resolution Engine",
  "#### Agent 2c: Build System...",
];

export function Hero() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(repo?: string) {
    const target = repo || input;
    if (!target.trim()) return;
    setLoading(true);
    window.dispatchEvent(
      new CustomEvent("unbuild:analyze", { detail: { repo: target } })
    );
    setTimeout(() => setLoading(false), 500);
  }

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Copy + Input */}
          <m.div variants={stagger} initial="hidden" animate="visible">
            <m.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted mb-6">
              <Sparkles size={12} className="text-accent" />
              Repos. Websites. Products. APIs. Ideas. Anything.
            </m.div>

            <m.h1
              variants={fadeUp}
              className="font-bold tracking-tight leading-[1.1] mb-4"
              style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)" }}
            >
              Reverse engineer
              <br />
              <span className="text-accent">anything</span>
            </m.h1>

            <m.p
              variants={fadeUp}
              className="text-muted leading-relaxed mb-8 max-w-md"
              style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)" }}
            >
              Paste a GitHub repo, website URL, product link, API spec, or
              describe what you want to build. Get a deep blueprint,
              CLAUDE.md, and implementation plan that forces the AI to
              research, plan, build, and test.
            </m.p>

            {/* Input */}
            <m.div variants={fadeUp}>
              <div className="input-focus border border-border rounded-xl flex bg-white transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Repo, website, product URL, or describe anything..."
                  className="flex-1 bg-transparent px-4 py-3 text-foreground placeholder-muted/60 outline-none text-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => submit()}
                  disabled={loading || !input.trim()}
                  className="px-5 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-r-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm whitespace-nowrap"
                >
                  Analyze <ArrowRight size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {EXAMPLE_INPUTS.map((ex) => (
                  <button
                    key={ex.input}
                    onClick={() => {
                      setInput(ex.input);
                      submit(ex.input);
                    }}
                    disabled={loading}
                    className="px-2.5 py-1 text-xs border border-border rounded-md text-muted hover:text-foreground hover:border-border-bright transition-colors disabled:opacity-40"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </m.div>
          </m.div>

          {/* Right: Live output preview */}
          <m.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-accent/5 rounded-2xl blur-xl" />

              {/* Preview card */}
              <div className="relative border border-border rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Tab bar */}
                <div className="flex items-center border-b border-border px-4 py-2 bg-surface text-xs">
                  <span className="text-accent font-medium">Blueprint</span>
                  <span className="ml-4 text-muted">CLAUDE.md</span>
                  <span className="ml-4 text-muted">Architecture</span>
                </div>

                {/* Content preview */}
                <div className="p-4 max-h-[420px] overflow-hidden relative">
                  <div className="font-mono text-xs leading-relaxed text-foreground/80 space-y-0">
                    {PREVIEW_LINES.map((line, i) => (
                      <m.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.04 }}
                        className={
                          line.startsWith("# ")
                            ? "text-foreground font-bold text-sm mt-2"
                            : line.startsWith("## ")
                              ? "text-foreground font-semibold text-xs mt-3 border-b border-border/50 pb-1"
                              : line.startsWith("### ")
                                ? "text-accent font-medium mt-2"
                                : line.startsWith("#### ")
                                  ? "text-muted font-medium mt-1 pl-2"
                                  : line.startsWith("- ")
                                    ? "pl-2 text-foreground/70"
                                    : line.startsWith("1.") || line.startsWith("2.")
                                      ? "pl-4 text-foreground/60"
                                      : ""
                        }
                      >
                        {line || "\u00A0"}
                      </m.div>
                    ))}
                  </div>
                  {/* Fade out bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
