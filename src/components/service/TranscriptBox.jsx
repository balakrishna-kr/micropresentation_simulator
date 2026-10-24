"use client";
import { useEffect, useRef } from "react";

export default function TranscriptBox({
  transcript,
  interimText,
  label,
  isRecording,
  isTranscribing,
}) {
  const boxRef = useRef(null);

  // Auto-scroll to bottom when new text appears
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [transcript, interimText, isTranscribing]);

  return (
    <div className="glass rounded-xl overflow-hidden shadow-lg border border-white/5" id="transcript-box">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isTranscribing
                ? "bg-amber-400 animate-spin"
                : isRecording
                ? "bg-red-400 animate-pulse"
                : "bg-emerald-400"
            }`}
          />
          <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            {label || "Speech Transcript"}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {isTranscribing
            ? "Groq Whisper"
            : transcript
            ? `${transcript.trim().split(/\s+/).filter(Boolean).length} words`
            : "Whisper Large v3"}
        </div>
      </div>

      {/* Transcript Content */}
      <div
        ref={boxRef}
        className="transcript-box p-4 min-h-[120px] max-h-[200px] text-sm leading-relaxed overflow-y-auto"
      >
        {isTranscribing ? (
          <div className="flex items-center gap-3 py-4 text-amber-300/90 animate-pulse">
            <div className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin shrink-0" />
            <span className="text-xs font-medium">
              Transcribing audio with Groq Whisper-large-v3...
            </span>
          </div>
        ) : transcript || interimText ? (
          <div className="text-slate-200">
            <span>{transcript}</span>
            {interimText && (
              <span className="text-slate-400 italic ml-1">
                {interimText}
              </span>
            )}
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2 py-4 text-slate-400 text-xs italic">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
            <span>Recording speech... click submit or wait for timer when done.</span>
          </div>
        ) : (
          <span className="text-slate-500 italic text-xs">
            Audio transcript will appear here after recording...
          </span>
        )}
      </div>
    </div>
  );
}
