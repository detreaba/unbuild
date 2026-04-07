"use client";

import { GitFork } from "lucide-react";
import { AnimatedSection } from "@/components/ui/animated-section";

export function OpenSourceCta() {
  return (
    <section className="py-16">
      <div className="max-w-2xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center">
            <p className="text-muted text-sm mb-4">
              MIT Licensed &middot; Open Source &middot; Contributions Welcome
            </p>
            <a
              href="https://github.com/detreaba/unbuild"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 border border-border rounded-lg text-sm text-muted hover:text-foreground hover:border-border-bright transition-colors"
            >
              <GitFork size={14} />
              View on GitHub
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
