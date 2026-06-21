const FEATURES = [
  {
    icon: "🎤",
    title: "Real-Time Speech Analysis",
    description:
      "AI evaluates your content structure, vocabulary, argument strength, and delivery clarity — just like a real admission panel.",
    gradient: "from-white to-slate-200 text-slate-900",
  },
  {
    icon: "😊",
    title: "Facial Expression Tracking",
    description:
      "Client-side face detection tracks your confidence, nervousness, and engagement levels throughout the session.",
    gradient: "from-slate-100 to-slate-300 text-slate-900",
  },
  {
    icon: "🤚",
    title: "Body Language & Gestures",
    description:
      "Hand movement tracking detects fidgeting, stiffness, and natural gesturing. Eye contact monitoring ensures you stay focused.",
    gradient: "from-slate-200 to-slate-400 text-slate-900",
  },
];

export default function Features() {
  return (
    <section className="relative py-24 px-4" id="features-section">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Complete{" "}
            <span className="gradient-text">Behavioral Analysis</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Our AI analyzes every aspect of your presentation &amp; interview performance using
            browser-native technology — no data leaves your device.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 group hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1"
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
              >
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-center mb-10">
            How It{" "}
            <span className="gradient-text">Works</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {[
              { step: "1", title: "Introduce", desc: "Say hello" },
              { step: "2", title: "Prepare", desc: "Get your topic" },
              { step: "3", title: "Present", desc: "Deliver your speech" },
              { step: "4", title: "Q&A", desc: "Answer 4 questions" },
              { step: "5", title: "Evaluate", desc: "Get AI feedback" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-slate-200 text-slate-900 flex items-center justify-center font-bold text-lg mb-3 shadow-lg shadow-white/10">
                  {item.step}
                </div>
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
                {i < 4 && (
                  <div className="hidden md:block absolute translate-x-[100%] text-slate-600">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
