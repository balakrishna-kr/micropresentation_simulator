"use client";
import { PHASE_ORDER, PHASE_LABELS, PHASES } from "@/lib/constants";

export default function PhaseIndicator({ currentPhase }) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="flex items-center justify-between w-full gap-1" id="phase-indicator">
      {PHASE_ORDER.map((phase, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = phase === currentPhase;
        const isFuture = i > currentIndex;

        return (
          <div key={phase} className="flex items-center flex-1">
            {/* Step */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : isCurrent
                    ? "bg-white/20 text-white border border-white/40 animate-pulse-glow"
                    : "bg-white/5 text-slate-600 border border-white/10"
                }`}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 text-center font-medium transition-colors ${
                  isCompleted
                    ? "text-emerald-400"
                    : isCurrent
                    ? "text-white"
                    : "text-slate-600"
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>

            {/* Connector line */}
            {i < PHASE_ORDER.length - 1 && (
              <div
                className={`h-[2px] flex-1 mx-1 rounded transition-colors duration-500 ${
                  isCompleted
                    ? "bg-emerald-500/30"
                    : "bg-white/5"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
