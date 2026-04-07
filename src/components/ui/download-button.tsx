"use client";

import { Download } from "lucide-react";

interface DownloadButtonProps {
  content: string;
  filename: string;
  label: string;
}

export function DownloadButton({ content, filename, label }: DownloadButtonProps) {
  function handleDownload() {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg text-muted hover:text-foreground hover:border-border-bright transition-colors"
    >
      <Download size={14} />
      {label}
    </button>
  );
}
