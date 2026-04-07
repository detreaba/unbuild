"use client";

import { m, AnimatePresence } from "framer-motion";
import { Check, Circle, Loader2 } from "lucide-react";
import { LOADING_STAGES } from "@/lib/constants";

interface LoadingStatesProps {
  currentStage: string;
}

export function LoadingStates({ currentStage }: LoadingStatesProps) {
  const currentIdx = LOADING_STAGES.indexOf(currentStage as typeof LOADING_STAGES[number]);

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl p-6 bg-surface"
    >
      <div className="flex items-center gap-3 mb-5">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={20} className="text-accent" />
        </m.div>
        <div>
          <p className="font-medium text-sm">Deep analysis in progress...</p>
          <p className="text-xs text-muted mt-0.5">{currentStage}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {LOADING_STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;

          return (
            <div
              key={stage}
              className={`flex items-center gap-2.5 text-sm py-1 ${
                isDone
                  ? "text-success"
                  : isCurrent
                    ? "text-accent"
                    : "text-muted/40"
              }`}
            >
              <AnimatePresence mode="wait">
                {isDone ? (
                  <m.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check size={14} />
                  </m.span>
                ) : isCurrent ? (
                  <m.span
                    key="active"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Circle size={14} fill="currentColor" />
                  </m.span>
                ) : (
                  <Circle size={14} key="inactive" />
                )}
              </AnimatePresence>
              {stage}
            </div>
          );
        })}
      </div>
    </m.div>
  );
}
