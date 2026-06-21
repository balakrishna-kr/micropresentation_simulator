"use client";
import { useEffect, useRef } from "react";

export default function TranscriptBox({ transcript, interimText, label }) {
  const boxRef = useRef(null);

  // Auto-scroll to bottom when new text appears
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  return (
    <div className="glass rounded-xl overflow-hidden" id="transcript-box">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {label || "Live Transcript"}
          </span>
        </div>
        <div className="text-xs text-slate-600 font-mono">
          {transcript ? `${transcript.split(" ").length} words` : "0 words"}
        </div>
      </div>

      {/* Transcript Content */}
      <div
        ref={boxRef}
        className="transcript-box p-4 min-h-[120px] max-h-[200px] text-sm leading-relaxed"
      >
        {transcript || interimText ? (
          <>
            <span className="text-slate-300">{transcript}</span>
            {interimText && (
              <span className="text-white/50 italic animate-fade-in">
                {interimText}
              </span>
            )}
          </>
        ) : (
          <span className="text-slate-600 italic">
            Waiting for speech input...
          </span>
        )}
      </div>
    </div>
  );
}
