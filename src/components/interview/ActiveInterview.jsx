"use client";
import { useRef, useEffect } from "react";
import { INTERVIEW_STEPS } from "@/lib/interviewConstants";
import CameraFeed from "@/components/service/CameraFeed";
import TranscriptBox from "@/components/service/TranscriptBox";
import InterviewStepIndicator from "./InterviewStepIndicator";

export default function ActiveInterview({
  stateMachine,
  config,
  visionTracking,
}) {
  const cameraRef = useRef(null);
  const {
    step,
    waitingForUser,
    statusMessage,
    qaHistory,
    evaluation,
    score,
    currentQALabel,
    confirmResponse,
    abortInterview,
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
    }, 2000);

    return () => {
      clearTimeout(timer);
      visionTracking.stopTracking();
    };
  }, []);

  const showTranscript =
    step === INTERVIEW_STEPS.INTRODUCTION ||
    step === INTERVIEW_STEPS.FAVORITE_SUBJECT ||
    step === INTERVIEW_STEPS.SYLLABUS_QA ||
    step === INTERVIEW_STEPS.ECA_QA ||
    step === INTERVIEW_STEPS.GEOPOLITICS;

  const getTranscriptLabel = () => {
    switch (step) {
      case INTERVIEW_STEPS.INTRODUCTION:
        return "Your Introduction";
      case INTERVIEW_STEPS.FAVORITE_SUBJECT:
        return "Your Favorite Subject";
      case INTERVIEW_STEPS.SYLLABUS_QA:
        return currentQALabel || "Subject Q&A";
      case INTERVIEW_STEPS.ECA_QA:
        return currentQALabel || "ECA Q&A";
      case INTERVIEW_STEPS.GEOPOLITICS:
        return "Current Affairs";
      default:
        return "Live Transcript";
    }
  };

  const getButtonLabel = () => {
    switch (step) {
      case INTERVIEW_STEPS.INTRODUCTION:
        return "✓ Done Introducing";
      case INTERVIEW_STEPS.FAVORITE_SUBJECT:
        return "✓ Submit Subject";
      case INTERVIEW_STEPS.GEOPOLITICS:
        return "✓ Submit Response";
      default:
        return "✓ Submit Answer";
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto w-full mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🎓</span>
            <span className="text-sm font-medium text-white">
              Personal Interview Session
            </span>
          </div>
          <button
            id="abort-interview-btn"
            onClick={abortInterview}
            className="px-4 py-2 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            ✕ End Session
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <InterviewStepIndicator currentStep={step} />
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed - 2 columns */}
        <div className="lg:col-span-2">
          <CameraFeed
            ref={cameraRef}
            isActive={step !== INTERVIEW_STEPS.IDLE}
            expression={visionTracking.currentExpression}
            isWarning={false}
          />
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Status Message */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  waitingForUser
                    ? "bg-amber-400 animate-pulse"
                    : "bg-white animate-pulse"
                }`}
              />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </span>
            </div>
            <p className="text-sm text-slate-300">{statusMessage}</p>
          </div>

          {/* Transcript */}
          {showTranscript && (
            <TranscriptBox
              transcript={transcript}
              interimText={interimText}
              label={getTranscriptLabel()}
            />
          )}

          {/* User Action Button */}
          {waitingForUser && (
            <button
              id="interview-continue-btn"
              onClick={confirmResponse}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20 animate-fade-in text-sm"
            >
              {getButtonLabel()}
            </button>
          )}

          {/* Repeat hint */}
          {waitingForUser && (
            <div className="text-center">
              <p className="text-[10px] text-slate-600 italic">
                💡 Say &quot;repeat&quot; or &quot;can you repeat that?&quot; to
                hear the question again
              </p>
            </div>
          )}

          {/* Vision Loading */}
          {visionTracking.isLoading && (
            <div className="glass rounded-xl p-3 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Loading vision models...
            </div>
          )}
        </div>
      </div>

      {/* Q&A History */}
      {qaHistory.length > 0 && (
        <div className="max-w-6xl mx-auto w-full mt-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>💬</span> Interview Q&A Progress
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
      {step === INTERVIEW_STEPS.EVALUATION && evaluation && (
        <div className="max-w-6xl mx-auto w-full mt-6 animate-fade-in-up">
          <div className="glass-strong rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>📊</span> Your Interview Evaluation
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
