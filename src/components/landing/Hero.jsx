export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-slate-500/5 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-slate-300 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          AI-Powered Presentation &amp; Interview Coach
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Master Your <span className="gradient-text">Micro-Presentations</span> &amp; <span className="gradient-text">Personal Interviews</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          Practice college micro-presentation &amp; personal interview rounds with real-time AI analysis
          of your <span className="text-slate-100 font-semibold">speech content</span>,{" "}
          <span className="text-slate-200 font-semibold">facial expressions</span>, and{" "}
          <span className="text-slate-300 font-semibold">body language</span>.
          Designed for Indian Management admissions.
        </p>

        {/* CTA Button */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <a
            href="/service"
            id="launch-demo-btn"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-white to-slate-200 hover:from-slate-100 hover:to-slate-300 text-slate-950 font-semibold text-lg rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/10 animate-pulse-glow"
          >
            Launch Free Demo
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>

        {/* Preview Cards */}
        <div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          {[
            { icon: "🎯", label: "Curated Practice", sublabel: "Management focused" },
            { icon: "⏱️", label: "Timed & Flow Rounds", sublabel: "Just like real interviews" },
            { icon: "🧠", label: "AI Evaluation", sublabel: "Comprehensive scoring & tips" },
          ].map((item, i) => (
            <div
              key={i}
              className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="text-left">
                <div className="font-medium text-sm text-slate-200">{item.label}</div>
                <div className="text-xs text-slate-500">{item.sublabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
