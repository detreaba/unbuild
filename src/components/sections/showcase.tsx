"use client";

import { m } from "framer-motion";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Code, Globe, Package, MessageSquare } from "lucide-react";

const INPUT_TYPES = [
  {
    icon: Code,
    title: "GitHub Repos",
    example: "vercel/next.js",
    description: "Full codebase analysis — file tree, dependencies, architecture patterns, entry points. Produces implementation blueprint with exact commands.",
  },
  {
    icon: Globe,
    title: "Any Website",
    example: "stripe.com",
    description: "Renders the page with a real browser. Extracts design system, navigation, components, and infers the full backend architecture.",
  },
  {
    icon: Package,
    title: "Product Pages",
    example: "adafruit.com/product/5613",
    description: "Component teardown, bill of materials, assembly instructions, and open-source alternatives for hardware and physical products.",
  },
  {
    icon: MessageSquare,
    title: "Ideas & Descriptions",
    example: "Build me a Duolingo clone...",
    description: "Describe any app, tool, or product in plain text. Get a researched blueprint with tech stack, data model, and phased build plan.",
  },
];

export function Showcase() {
  return (
    <section className="py-20 bg-surface">
      <div className="max-w-5xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2
              className="font-bold mb-3"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
            >
              Paste anything. Get a blueprint.
            </h2>
            <p className="text-muted text-sm max-w-lg mx-auto">
              Not limited to code. UnBuild analyzes repos, websites, products,
              APIs, and plain-text ideas — then produces everything an AI needs
              to build it.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 gap-5">
          {INPUT_TYPES.map((type, i) => (
            <AnimatedSection key={type.title} delay={i * 0.08}>
              <m.div
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="border border-border rounded-xl p-5 bg-white h-full"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                    <type.icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{type.title}</h3>
                    <p className="text-xs font-mono text-muted mt-0.5">{type.example}</p>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed">{type.description}</p>
              </m.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
