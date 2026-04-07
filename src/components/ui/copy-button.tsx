"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <m.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-success"
          >
            <Check size={14} />
          </m.span>
        ) : (
          <m.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy size={14} />
          </m.span>
        )}
      </AnimatePresence>
      {copied ? "Copied!" : label}
    </button>
  );
}
