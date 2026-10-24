"use client";
import Link from "next/link";

export default function ModuleSelector({ onSelectMode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="gradient-text">Choose Your Practice Mode</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Select the admissions round you want to practice. Both modules use
            AI-powered real-time analysis with voice interaction.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Micro-Presentation Card */}
          <button
            id="module-presentation"
            onClick={() => onSelectMode("presentation")}
            className="module-card glass-strong rounded-2xl p-8 text-left group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300">
              🎤
            </div>
            <h2 className="text-xl font-bold mb-2 text-white group-hover:text-white transition-colors">
              Micro-Presentation
            </h2>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              Practice timed presentations with AI-generated topics. Get
              evaluated on content, delivery, body language, and Q&A
              performance.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {["Topic Selection", "Timed Rounds", "Q&A", "Scoring"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10 font-medium"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
              Start Practice
              <svg
                className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>

          {/* Personal Interview Card */}
          <button
            id="module-interview"
            onClick={() => onSelectMode("interview")}
            className="module-card glass-strong rounded-2xl p-8 text-left group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300">
              🎓
            </div>
            <h2 className="text-xl font-bold mb-2 text-white group-hover:text-white transition-colors">
              Personal Interview
            </h2>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              Full 8-step AI interview covering academics, extracurriculars,
              subject knowledge, and current affairs. Voice-interactive with
              real-time analysis.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                "8-Step Flow",
                "Voice AI",
                "Subject Q&A",
                "Current Affairs",
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
              Start Practice
              <svg
                className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Back to home link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
