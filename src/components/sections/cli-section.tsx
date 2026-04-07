"use client";

import { AnimatedSection } from "@/components/ui/animated-section";
import { CopyButton } from "@/components/ui/copy-button";

const CMD = "npx unbuild-dev vercel/next.js";

export function CliSection() {
  return (
    <section id="cli" className="py-16">
      <div className="max-w-3xl mx-auto px-4">
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-border bg-surface">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Works from your terminal</h3>
              <p className="text-xs text-muted">
                Analyze repos, websites, or anything — right from the command line.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#141413] rounded-lg font-mono text-xs text-white whitespace-nowrap">
              <span className="text-success">$</span> {CMD}
              <CopyButton text={CMD} label="" className="text-white/40 hover:text-white" />
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
