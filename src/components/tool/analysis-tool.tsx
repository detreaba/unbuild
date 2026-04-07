"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { AnalysisResult } from "@/lib/types";
import { LoadingStates } from "./loading-states";
import { ResultViewer } from "./result-viewer";
import { CopyButton } from "@/components/ui/copy-button";
import { detectInputType, getLoadingStages } from "@/lib/analyzers/input-detector";

export function AnalysisTool() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [inputType, setInputType] = useState(detectInputType(""));
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const autoSubmitted = useRef(false);

  useEffect(() => {
    const repoParam = searchParams.get("repo");
    if (repoParam && !autoSubmitted.current) {
      autoSubmitted.current = true;
      handleSubmit(repoParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!loading) return;
    const stages = getLoadingStages(inputType);
    let i = 0;
    setLoadingStage(stages[0]);
    const interval = setInterval(() => {
      i = Math.min(i + 1, stages.length - 1);
      setLoadingStage(stages[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading, inputType]);

  async function handleSubmit(input: string) {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const type = detectInputType(input);
    setInputType(type);

    try {
      let res: Response;

      if (type === "github-repo") {
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo: input }),
        });
      } else if (type === "website") {
        const url = input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`;
        res = await fetch("/api/analyze-website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        // Product, API spec, text, unknown — all go to universal
        res = await fetch("/api/analyze-universal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Analysis failed");
      setResult(data.data);
      // Update URL to shareable link without reload
      if (data.slug) {
        window.history.pushState({}, "", `/r/${data.slug}`);
        setShareSlug(data.slug);
      }
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.repo) handleSubmit(detail.repo);
    }
    window.addEventListener("unbuild:analyze", handler);
    return () => window.removeEventListener("unbuild:analyze", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={resultRef} className="max-w-6xl mx-auto px-4">
      {loading && (
        <div className="max-w-4xl mx-auto pb-12">
          <LoadingStates currentStage={loadingStage} />
        </div>
      )}

      {error && (
        <div className="max-w-4xl mx-auto pb-8">
          <div className="border border-error/30 rounded-xl p-4 bg-error/5 text-error">
            <p className="font-medium text-sm">Analysis failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <>
          {shareSlug && (
            <div className="max-w-6xl mx-auto mb-4 p-3 border border-accent/20 rounded-xl bg-accent/5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted">
                Shareable link: <a href={`/r/${shareSlug}`} className="text-accent font-mono hover:underline">/r/{shareSlug}</a>
                — Share this with any AI coding tool to start building
              </p>
              <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/r/${shareSlug}`} label="Copy Link" />
            </div>
          )}
          <ResultViewer result={result} />
        </>
      )}
    </div>
  );
}
