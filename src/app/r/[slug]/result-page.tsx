"use client";

import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResultViewer } from "@/components/tool/result-viewer";
import type { AnalysisResult } from "@/lib/types";
import { Share2, ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

interface ResultPageProps {
  result: {
    slug: string;
    input: string;
    inputType: string;
    createdAt: string;
    data: Record<string, unknown>;
  };
}

export function ResultPage({ result }: ResultPageProps) {
  const data = result.data as unknown as AnalysisResult;
  const shareUrl = typeof window !== "undefined"
    ? window.location.href
    : `/r/${result.slug}`;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Share banner */}
          <div className="mb-6 p-4 border border-accent/20 rounded-xl bg-accent/5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Share2 size={16} className="text-accent" />
                  <h2 className="font-semibold text-sm">Shareable Analysis</h2>
                </div>
                <p className="text-xs text-muted max-w-lg">
                  Share this URL with any AI coding tool (Claude Code, Cursor, Codex, Windsurf).
                  The AI can read this page to understand what to build. Download the 3 files below
                  and place CLAUDE.md in your project root.
                </p>
              </div>
              <CopyButton text={shareUrl} label="Copy Link" />
            </div>

            {/* LLM-readable instruction block */}
            <details className="mt-3">
              <summary className="text-xs text-muted cursor-pointer hover:text-foreground">
                Instructions for AI agents
              </summary>
              <div className="mt-2 p-3 bg-white rounded-lg border border-border text-xs font-mono text-muted leading-relaxed">
                <p>This page contains a reverse engineering analysis of <strong>{result.input}</strong>.</p>
                <p className="mt-1">To use this analysis:</p>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>Download the CLAUDE.md file and place it in your project root</li>
                  <li>Read the Implementation Blueprint for the full build plan</li>
                  <li>Follow Phase 0 (Research) before writing code</li>
                  <li>Use the Architecture JSON to understand the structure</li>
                  <li>The files are available at: /api/results/{result.slug}</li>
                </ol>
              </div>
            </details>
          </div>

          {/* Metadata */}
          <p className="text-xs text-muted mb-4">
            Analyzed: {result.createdAt.split("T")[0]} &middot;
            Type: {result.inputType} &middot;
            Input: <span className="font-mono">{result.input}</span>
          </p>

          {/* Results */}
          <Suspense>
            <ResultViewer result={data} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
