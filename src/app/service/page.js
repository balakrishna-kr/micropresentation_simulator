"use client";
import { useState, useCallback } from "react";
import ModuleSelector from "@/components/service/ModuleSelector";
import ConfigPanel from "@/components/service/ConfigPanel";
import ActiveRound from "@/components/service/ActiveRound";
import InterviewConfigPanel from "@/components/interview/InterviewConfigPanel";
import ActiveInterview from "@/components/interview/ActiveInterview";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useVisionTracking } from "@/hooks/useVisionTracking";
import { useRoundStateMachine } from "@/hooks/useRoundStateMachine";
import { useInterviewStateMachine } from "@/hooks/useInterviewStateMachine";
import { PHASES } from "@/lib/constants";

export default function ServicePage() {
  // null = module selector, "presentation" = existing flow, "interview" = new flow
  const [mode, setMode] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState(null);

  const speechRecognition = useSpeechRecognition();
  const speechSynthesis = useSpeechSynthesis();
  const visionTracking = useVisionTracking();

  // ─── Existing Presentation State Machine ─────────
  const handlePresentationComplete = useCallback(() => {
    visionTracking.stopTracking();
    visionTracking.clearLog();
    speechRecognition.stop();
    speechRecognition.resetTranscript();
    speechSynthesis.cancel();
    setIsActive(false);
    setConfig(null);
  }, [visionTracking, speechRecognition, speechSynthesis]);

  const presentationStateMachine = useRoundStateMachine({
    speechRecognition,
    speechSynthesis,
    visionTracking,
    config: config || { prepTime: 60, presentTime: 60, topic: { title: "" } },
    onComplete: handlePresentationComplete,
  });

  // ─── New Interview State Machine ─────────────────
  const handleInterviewComplete = useCallback(() => {
    visionTracking.stopTracking();
    visionTracking.clearLog();
    speechRecognition.stop();
    speechRecognition.resetTranscript();
    speechSynthesis.cancel();
    setIsActive(false);
    setConfig(null);
    setMode(null); // go back to module selector
  }, [visionTracking, speechRecognition, speechSynthesis]);

  const interviewStateMachine = useInterviewStateMachine({
    speechRecognition,
    speechSynthesis,
    visionTracking,
    config: config || { academicData: {}, ecaList: [] },
    onComplete: handleInterviewComplete,
  });

  // ─── Browser Support Check ──────────────────────
  const checkBrowserSupport = useCallback(() => {
    if (!speechRecognition.isSupported) {
      alert(
        "Your browser does not support Speech Recognition. Please use Chrome or Edge."
      );
      return false;
    }
    if (!speechSynthesis.isSupported) {
      alert(
        "Your browser does not support Text-to-Speech. Please use Chrome or Edge."
      );
      return false;
    }
    return true;
  }, [speechRecognition.isSupported, speechSynthesis.isSupported]);

  // ─── Start Presentation ─────────────────────────
  const handleStartPresentation = useCallback(
    (sessionConfig) => {
      if (!checkBrowserSupport()) return;
      setConfig(sessionConfig);
      setIsActive(true);
      setTimeout(() => {
        presentationStateMachine.startRound();
      }, 500);
    },
    [checkBrowserSupport, presentationStateMachine]
  );

  // ─── Start Interview ────────────────────────────
  const handleStartInterview = useCallback(
    (sessionConfig) => {
      if (!checkBrowserSupport()) return;
      setConfig(sessionConfig);
      setIsActive(true);
      setTimeout(() => {
        interviewStateMachine.startInterview();
      }, 500);
    },
    [checkBrowserSupport, interviewStateMachine]
  );

  // ─── RENDER ─────────────────────────────────────

  // Module selector
  if (mode === null) {
    return <ModuleSelector onSelectMode={setMode} />;
  }

  // Presentation flow
  if (mode === "presentation") {
    if (!isActive) {
      return (
        <ConfigPanel
          onStart={handleStartPresentation}
          onBack={() => setMode(null)}
        />
      );
    }
    return (
      <ActiveRound
        stateMachine={presentationStateMachine}
        config={config}
        visionTracking={visionTracking}
      />
    );
  }

  // Interview flow
  if (mode === "interview") {
    if (!isActive) {
      return (
        <InterviewConfigPanel
          onStart={handleStartInterview}
          onBack={() => setMode(null)}
        />
      );
    }
    return (
      <ActiveInterview
        stateMachine={interviewStateMachine}
        config={config}
        visionTracking={visionTracking}
      />
    );
  }

  return null;
}
