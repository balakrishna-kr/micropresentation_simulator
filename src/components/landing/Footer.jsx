export default function Footer() {
  return (
    <footer className="relative py-8 px-4 border-t border-white/5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">MicroPres &amp; Interview AI</span>
          <span>•</span>
          <span>Zero-cost admissions presentation &amp; interview coach</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Requires Chrome or Edge
          </div>
          <span className="text-slate-600">
            © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}
