"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Star } from "lucide-react";
import type { AnalysisResult, TabId } from "@/lib/types";
import { StatBar } from "./stat-bar";
import { CopyButton } from "@/components/ui/copy-button";
import { DownloadButton } from "@/components/ui/download-button";

interface ResultViewerProps {
  result: AnalysisResult;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "blueprint", label: "Implementation Blueprint" },
  { id: "claude-md", label: "CLAUDE.md" },
  { id: "architecture", label: "Architecture Analysis" },
];

export function ResultViewer({ result }: ResultViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("blueprint");

  const tabContent: Record<TabId, string> = {
    blueprint: result.blueprint,
    "claude-md": result.claudeMd,
    architecture: JSON.stringify(result.architecture, null, 2),
  };

  const stats = [
    {
      label: "Files Analyzed",
      value: `${result.analysis.filesAnalyzed} / ${result.analysis.totalFiles}`,
    },
    { label: "Project Type", value: result.analysis.projectType },
    { label: "Architecture", value: result.architecture.architecture.pattern },
    { label: "Max Depth", value: String(result.analysis.maxDepth) },
    { label: "Monorepo", value: result.analysis.isMonorepo ? "Yes" : "No" },
  ];

  const repoSlug = result.meta.name.replace("/", "-");

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Repo header */}
      <div className="border border-border rounded-xl p-6 bg-surface mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold">{result.meta.name}</h2>
            {result.meta.description && (
              <p className="text-sm text-muted mt-1 max-w-2xl">
                {result.meta.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            {result.meta.stars > 0 && (
              <span className="flex items-center gap-1">
                <Star size={14} />
                {result.meta.stars.toLocaleString()}
              </span>
            )}
            {result.meta.language && <span>{result.meta.language}</span>}
            {result.meta.license && <span>{result.meta.license}</span>}
          </div>
        </div>
        <StatBar stats={stats} />
      </div>

      {/* Tabs */}
      <div className="border border-border rounded-xl bg-surface overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "tab-active"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <CopyButton text={tabContent[activeTab]} className="px-4 py-3" />
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            <m.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "architecture" ? (
                <pre className="text-sm whitespace-pre-wrap font-mono" style={{ background: "#0f172a", color: "#e2e8f0" }}>
                  {tabContent.architecture}
                </pre>
              ) : (
                <div className="blueprint-content whitespace-pre-wrap text-sm leading-relaxed">
                  {tabContent[activeTab]}
                </div>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Downloads */}
      <div className="flex flex-wrap gap-3 mt-4">
        <DownloadButton
          content={result.blueprint}
          filename={`${repoSlug}-blueprint.md`}
          label="Blueprint"
        />
        <DownloadButton
          content={result.claudeMd}
          filename="CLAUDE.md"
          label="CLAUDE.md"
        />
        <DownloadButton
          content={JSON.stringify(result.architecture, null, 2)}
          filename={`${repoSlug}-architecture.json`}
          label="Architecture JSON"
        />
      </div>

      <p className="text-xs text-muted mt-4 text-center">
        Generated with {result.model} via UnBuild
      </p>
    </m.div>
  );
}
