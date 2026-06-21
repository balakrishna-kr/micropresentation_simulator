"use client";
import { useRef, useEffect } from "react";
import { PHASES, PHASE_LABELS } from "@/lib/constants";
import CameraFeed from "./CameraFeed";
import Timer from "./Timer";
import TranscriptBox from "./TranscriptBox";
import PhaseIndicator from "./PhaseIndicator";

export default function ActiveRound({ stateMachine, config, visionTracking }) {
  const cameraRef = useRef(null);
  const {
    phase,
    timeRemaining,
    qaHistory,
    evaluation,
    score,
    currentQAIndex,
    waitingForUser,
    statusMessage,
    confirmIntroduction,
    confirmAnswer,
    abortRound,
    transcript,
    interimText,
  } = stateMachine;

  // Initialize vision tracking when camera is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cameraRef.current) {
        const videoEl = cameraRef.current.getVideoElement();
        if (videoEl) {
          visionTracking.initTracking(videoEl);
        }
      }
    }, 2000); // Wait for camera to initialize

    return () => {
      clearTimeout(timer);
      visionTracking.stopTracking();
    };
  }, []);

  const isTimedPhase =
    phase === PHASES.PREPARATION || phase === PHASES.PRESENTATION;
  const totalTime =
    phase === PHASES.PREPARATION
      ? config.prepTime
      : phase === PHASES.PRESENTATION
      ? config.presentTime
      : 0;

  const getTranscriptLabel = () => {
    switch (phase) {
      case PHASES.GREETING:
        return "Your Introduction";
      case PHASES.PRESENTATION:
        return "Your Presentation";
      case PHASES.QA:
        return `Q&A Answer (${currentQAIndex}/${4})`;
      default:
        return "Live Transcript";
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto w-full mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Topic:</span>
            <span className="text-sm font-medium text-white">
              {config.topic.emoji} {config.topic.title}
            </span>
          </div>
          <button
            id="abort-round-btn"
            onClick={abortRound}
            className="px-4 py-2 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            ✕ End Session
          </button>
        </div>
      </div>

      {/* Phase Indicator */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <PhaseIndicator currentPhase={phase} />
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed - takes 2 columns */}
        <div className="lg:col-span-2">
          <CameraFeed
            ref={cameraRef}
            isActive={phase !== PHASES.IDLE}
            expression={visionTracking.currentExpression}
            isWarning={
              phase === PHASES.PRESENTATION && timeRemaining <= 10 && timeRemaining > 0
            }
          />
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Timer (shown during timed phases) */}
          {isTimedPhase && (
            <div className="glass rounded-2xl p-6 flex justify-center">
              <Timer
                timeRemaining={timeRemaining}
                totalTime={totalTime}
                phase={PHASE_LABELS[phase]}
              />
            </div>
          )}

          {/* Status Message */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  waitingForUser ? "bg-amber-400 animate-pulse" : "bg-white animate-pulse"
                }`}
              />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </span>
            </div>
            <p className="text-sm text-slate-300">{statusMessage}</p>
          </div>

          {/* Transcript */}
          {(phase === PHASES.GREETING ||
            phase === PHASES.PRESENTATION ||
            phase === PHASES.QA) && (
            <TranscriptBox
              transcript={transcript}
              interimText={interimText}
              label={getTranscriptLabel()}
            />
          )}

          {/* User Action Button */}
          {waitingForUser && (
            <button
              id="continue-btn"
              onClick={
                phase === PHASES.GREETING
                  ? confirmIntroduction
                  : confirmAnswer
              }
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20 animate-fade-in"
            >
              {phase === PHASES.GREETING
                ? "✓ Continue — I'm done introducing"
                : "✓ Submit My Answer"}
            </button>
          )}

          {/* Vision Loading State */}
          {visionTracking.isLoading && (
            <div className="glass rounded-xl p-3 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Loading vision models...
            </div>
          )}
        </div>
      </div>

      {/* Q&A History */}
      {phase === PHASES.QA && qaHistory.length > 0 && (
        <div className="max-w-6xl mx-auto w-full mt-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>💬</span> Q&A Round Progress
            </h3>
            <div className="space-y-3">
              {qaHistory.map((qa, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-300 font-medium shrink-0">
                      Q{i + 1}:
                    </span>
                    <span className="text-slate-300">{qa.question}</span>
                  </div>
                  {qa.answer && (
                    <div className="flex items-start gap-2 mt-1 ml-6">
                      <span className="text-emerald-400 font-medium shrink-0">
                        A:
                      </span>
                      <span className="text-slate-400">{qa.answer}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Display */}
      {phase === PHASES.EVALUATION && evaluation && (
        <div className="max-w-6xl mx-auto w-full mt-6 animate-fade-in-up">
          <div className="glass-strong rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>📊</span> Your Evaluation
              </h3>
              {score !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Score:</span>
                  <span
                    className={`text-3xl font-bold ${
                      score >= 7
                        ? "text-emerald-400"
                        : score >= 5
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {score}/10
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {evaluation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
