"use client";

import { m } from "framer-motion";
import { Search, Brain, Layers, FileText, ArrowDown } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

const STEPS = [
  {
    icon: Search,
    title: "Fetch & Extract",
    detail: "Real browser rendering",
    description: "Fetches your input using Playwright (a real browser). For repos: reads source code, configs, schemas. For websites: renders JavaScript, extracts CSS, crawls pages. For products: scrapes specs and components.",
  },
  {
    icon: Brain,
    title: "Understand the Product",
    detail: "Chain of Verification",
    description: "The AI doesn't just describe what it sees — it figures out what the product DOES, what backend it needs, what data it stores, and what open-source alternatives exist. Every claim must be backed by evidence.",
  },
  {
    icon: Layers,
    title: "Architect the Build",
    detail: "Multi-pass LLM analysis",
    description: "Three separate AI passes: architecture analysis (JSON), implementation blueprint with phased agent decomposition, and a standalone CLAUDE.md. Each pass builds on the previous one's decisions.",
  },
  {
    icon: FileText,
    title: "Generate the Prompt",
    detail: "800-1100 word IBP",
    description: "A dedicated Initial Build Prompt — the single document you paste into any AI coding tool. Instructs the AI to research first, plan the architecture, build in phases with parallel agents, and test with Playwright after each phase.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <AnimatedSection>
          <h2
            className="font-bold text-center mb-3"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
          >
            How UnBuild thinks
          </h2>
          <p className="text-center text-muted text-sm mb-14 max-w-md mx-auto">
            Four phases. Chain of Verification. Every claim evidence-based.
            The output works with any AI coding tool.
          </p>
        </AnimatedSection>

        <div className="space-y-1">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <AnimatedSection delay={i * 0.08}>
                <m.div
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex gap-5 p-5 rounded-xl hover:bg-surface transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-accent/8 text-accent flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                      <step.icon size={18} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1">
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      <span className="text-[10px] font-mono text-accent/70">{step.detail}</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{step.description}</p>
                  </div>
                </m.div>
              </AnimatedSection>
              {i < STEPS.length - 1 && (
                <div className="flex justify-start pl-[30px]">
                  <ArrowDown size={14} className="text-border-bright" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
