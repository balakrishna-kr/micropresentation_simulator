"use client";
import { useState, useCallback, useRef } from "react";
import ModuleSelector from "@/components/service/ModuleSelector";
import ConfigPanel from "@/components/service/ConfigPanel";
import ActiveRound from "@/components/service/ActiveRound";
import InterviewConfigPanel from "@/components/interview/InterviewConfigPanel";
import ActiveInterview from "@/components/interview/ActiveInterview";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useRoundStateMachine } from "@/hooks/useRoundStateMachine";
import { useInterviewStateMachine } from "@/hooks/useInterviewStateMachine";

export default function ServicePage() {
  // null = module selector, "presentation" = existing flow, "interview" = new flow
  const [mode, setMode] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState(null);

  const mediaRecorder = useMediaRecorder();
  const speechSynthesis = useSpeechSynthesis();

  // Helper to obtain current active video element for frame capture
  const getVideoElement = useCallback(() => {
    if (typeof document === "undefined") return null;
    const video = document.querySelector("#camera-feed video");
    return video;
  }, []);

  // ─── Presentation State Machine ───────────────────
  const handlePresentationComplete = useCallback(() => {
    mediaRecorder.stopPeriodicFrameCapture();
    mediaRecorder.stopStream();
    speechSynthesis.cancel();
    setIsActive(false);
    setConfig(null);
  }, [mediaRecorder, speechSynthesis]);

  const presentationStateMachine = useRoundStateMachine({
    mediaRecorder,
    speechSynthesis,
    config: config || { prepTime: 60, presentTime: 60, topic: { title: "" } },
    onComplete: handlePresentationComplete,
    getVideoElement,
  });

  // ─── Interview State Machine ─────────────────────
  const handleInterviewComplete = useCallback(() => {
    mediaRecorder.stopPeriodicFrameCapture();
    mediaRecorder.stopStream();
    speechSynthesis.cancel();
    setIsActive(false);
    setConfig(null);
    setMode(null); // return to module selector
  }, [mediaRecorder, speechSynthesis]);

  const interviewStateMachine = useInterviewStateMachine({
    mediaRecorder,
    speechSynthesis,
    config: config || { academicData: {}, ecaList: [] },
    onComplete: handleInterviewComplete,
    getVideoElement,
  });

  // ─── Browser Support Check ──────────────────────
  const checkBrowserSupport = useCallback(() => {
    if (typeof window === "undefined") return false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support camera and microphone access. Please use Chrome, Edge, or Safari.");
      return false;
    }
    if (typeof MediaRecorder === "undefined") {
      alert("Your browser does not support MediaRecorder audio recording. Please use Chrome or Edge.");
      return false;
    }
    if (!speechSynthesis.isSupported) {
      alert("Your browser does not support Text-to-Speech voice playback. Please use Chrome or Edge.");
      return false;
    }
    return true;
  }, [speechSynthesis.isSupported]);

  // ─── Start Presentation ─────────────────────────
  const handleStartPresentation = useCallback(
    async (sessionConfig) => {
      if (!checkBrowserSupport()) return;
      setConfig(sessionConfig);
      setIsActive(true);

      try {
        await mediaRecorder.startStream();
      } catch (err) {
        alert("Camera and microphone permission is required to run the presentation simulator.");
        setIsActive(false);
        return;
      }

      setTimeout(() => {
        presentationStateMachine.startRound();
      }, 500);
    },
    [checkBrowserSupport, mediaRecorder, presentationStateMachine]
  );

  // ─── Start Interview ────────────────────────────
  const handleStartInterview = useCallback(
    async (sessionConfig) => {
      if (!checkBrowserSupport()) return;
      setConfig(sessionConfig);
      setIsActive(true);

      try {
        await mediaRecorder.startStream();
      } catch (err) {
        alert("Camera and microphone permission is required to run the interview simulator.");
        setIsActive(false);
        return;
      }

      setTimeout(() => {
        interviewStateMachine.startInterview();
      }, 500);
    },
    [checkBrowserSupport, mediaRecorder, interviewStateMachine]
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
        mediaRecorder={mediaRecorder}
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
        mediaRecorder={mediaRecorder}
      />
    );
  }

  return null;
}
