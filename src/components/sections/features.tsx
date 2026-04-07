"use client";

import { m } from "framer-motion";
import { AnimatedSection } from "@/components/ui/animated-section";

const OUTPUTS = [
  {
    label: "Implementation Blueprint",
    ext: ".md",
    lines: "2000-4000 words",
    details: [
      "Product DNA — what it IS and DOES",
      "Multi-phase build plan with parallel agents",
      "Data model, API endpoints, auth flow",
      "Data seeding strategy (where initial data comes from)",
    ],
  },
  {
    label: "CLAUDE.md",
    ext: ".md",
    lines: "800-2000 words",
    details: [
      "Complete design system (colors, fonts, spacing)",
      "Dev commands, build order, test strategy",
      "Component specs with states and behavior",
      "Product-specific gotchas and warnings",
    ],
  },
  {
    label: "Initial Build Prompt",
    ext: "in blueprint",
    lines: "800-1100 words",
    details: [
      "The single prompt you paste into ANY AI tool",
      "Research phase: find similar open-source projects",
      "References CLAUDE.md instead of embedding it",
      "Agent decomposition for parallel work",
    ],
  },
  {
    label: "Architecture Analysis",
    ext: ".json",
    lines: "Structured",
    details: [
      "Evidence-based tech detection (not guessing)",
      "Component graph with dependencies",
      "User journeys with inferred API calls",
      "Reproduction challenges specific to this project",
    ],
  },
];

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-5xl mx-auto px-4">
        <AnimatedSection>
          <h2
            className="font-bold text-center mb-3"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
          >
            Four deliverables, one analysis
          </h2>
          <p className="text-center text-muted text-sm mb-14 max-w-lg mx-auto">
            Everything an AI coding tool needs to build from scratch.
            Works with Claude Code, Cursor, Codex, Windsurf, or any other.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {OUTPUTS.map((output, i) => (
            <AnimatedSection key={output.label} delay={i * 0.1}>
              <m.div
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="border border-border rounded-xl overflow-hidden bg-white h-full"
              >
                <div className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between">
                  <span className="text-sm font-medium">{output.label}</span>
                  <span className="text-[10px] font-mono text-muted">{output.ext}</span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-accent font-mono mb-2">{output.lines}</p>
                  <ul className="space-y-2">
                    {output.details.map((detail) => (
                      <li key={detail} className="flex gap-2 text-xs text-muted leading-relaxed">
                        <span className="text-accent mt-0.5 flex-shrink-0">&bull;</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </m.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
