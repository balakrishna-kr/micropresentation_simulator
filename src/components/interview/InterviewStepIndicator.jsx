"use client";
import {
  INTERVIEW_STEPS,
  INTERVIEW_STEP_ORDER,
  INTERVIEW_STEP_LABELS,
} from "@/lib/interviewConstants";

export default function InterviewStepIndicator({ currentStep }) {
  const currentIndex = INTERVIEW_STEP_ORDER.indexOf(currentStep);

  return (
    <div className="glass rounded-xl px-4 py-3" id="interview-step-indicator">
      <div className="flex items-center justify-between gap-1">
        {INTERVIEW_STEP_ORDER.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step === currentStep;
          const isPending = index > currentIndex;

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step dot + label */}
              <div className="flex flex-col items-center min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                    isCompleted
                      ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/40"
                      : isCurrent
                      ? "bg-white/20 text-white border border-white/45 animate-pulse-glow scale-110"
                      : "bg-white/5 text-slate-600 border border-white/10"
                  }`}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                <span
                  className={`text-[9px] mt-1 text-center leading-tight transition-colors duration-300 truncate max-w-[60px] ${
                    isCompleted
                      ? "text-emerald-400/70"
                      : isCurrent
                      ? "text-white font-semibold"
                      : "text-slate-600"
                  }`}
                >
                  {INTERVIEW_STEP_LABELS[step]}
                </span>
              </div>

              {/* Connector line (not after last) */}
              {index < INTERVIEW_STEP_ORDER.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-1 mt-[-12px] rounded transition-all duration-500 ${
                    isCompleted
                      ? "bg-emerald-500/40"
                      : isCurrent
                      ? "bg-white/20"
                      : "bg-white/5"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
