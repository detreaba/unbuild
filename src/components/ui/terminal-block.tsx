"use client";

import { m } from "framer-motion";
import { CopyButton } from "./copy-button";

interface TerminalBlockProps {
  lines: string[];
  copyText?: string;
}

export function TerminalBlock({ lines, copyText }: TerminalBlockProps) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border-b border-[#333]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="flex-1" />
        {copyText && <CopyButton text={copyText} label="" className="text-[#888] hover:text-white" />}
      </div>

      {/* Content */}
      <div className="bg-[#141413] p-4 font-mono text-sm">
        {lines.map((line, i) => (
          <m.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="leading-relaxed"
          >
            {line.startsWith("$") ? (
              <>
                <span className="text-success">$</span>
                <span className="text-[#e4e4e7]">{line.slice(1)}</span>
              </>
            ) : line.startsWith("✓") ? (
              <span className="text-success">{line}</span>
            ) : line.startsWith("→") ? (
              <span className="text-[#6a9bcc]">{line}</span>
            ) : (
              <span className="text-[#888]">{line}</span>
            )}
          </m.div>
        ))}
      </div>
    </div>
  );
}
