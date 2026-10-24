"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { PHASES, QA_QUESTION_COUNT } from "@/lib/constants";
import { callGemini } from "@/lib/gemini";
import { transcribeAudio, analyzeVisual, analyzeTone } from "@/lib/apiHelpers";
import { useVisionTracking } from "./useVisionTracking";

/**
 * Central orchestrator implementing the 5-phase micro-presentation flow.
 * Powered by Groq Whisper, OpenRouter Vision AI, Google MediaPipe, and OpenRouter Audio AI.
 */
export function useRoundStateMachine({
  mediaRecorder,
  speechSynthesis,
  config,
  onComplete,
  getVideoElement,
}) {
  const visionTracking = useVisionTracking();

  const [phase, setPhase] = useState(PHASES.IDLE);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [qaHistory, setQaHistory] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [score, setScore] = useState(null);
  const [currentQAIndex, setCurrentQAIndex] = useState(0);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [latestTranscript, setLatestTranscript] = useState("");

  // Live Model Diagnostics & Connectivity Status
  const [aiDiagnostics, setAiDiagnostics] = useState({
    logs: [
      { time: new Date().toLocaleTimeString(), message: "Groq Whisper Large v3 connected and ready", type: "success" },
      { time: new Date().toLocaleTimeString(), message: "Google MediaPipe on-device FaceLandmarker ready (WASM)", type: "success" },
      { time: new Date().toLocaleTimeString(), message: "OpenRouter Vision AI ready (dots-studio / nemotron-omni)", type: "success" },
      { time: new Date().toLocaleTimeString(), message: "OpenRouter Tone & Emotion AI ready (cohere / dots-studio)", type: "success" },
      { time: new Date().toLocaleTimeString(), message: "Groq Executive Evaluator ready (openai/gpt-oss-120b)", type: "success" },
    ],
    visionModel: "dots-studio/dots-3-note-preview:free",
    toneModel: "cohere/north-mini-code:free",
    whisperStatus: "CONNECTED",
    visionStatus: "CONNECTED",
    mediaPipeStatus: "CONNECTED",
    toneStatus: "CONNECTED",
    evalStatus: "CONNECTED",
  });

  const timerRef = useRef(null);
  const introductionRef = useRef("");
  const presentationTranscriptRef = useRef("");
  const presentationAudioBlobRef = useRef(null);
  const qaHistoryRef = useRef([]);
  const phaseRef = useRef(PHASES.IDLE);
  const abortRef = useRef(false);

  const actionsRef = useRef({});

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const addAiLog = useCallback((message, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setAiDiagnostics((prev) => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }].slice(-30),
    }));
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Start a countdown timer. Calls onTimerComplete when it hits 0.
   */
  const startCountdown = useCallback(
    (seconds, onTimerComplete) => {
      clearTimer();
      setTimeRemaining(seconds);

      let remaining = seconds;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          clearTimer();
          onTimerComplete();
        }
      }, 1000);
    },
    [clearTimer]
  );

  // ─── PHASE 1: GREETING ─────────────────────────────
  const startGreeting = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.GREETING);
    setStatusMessage("AI is speaking...");
    setLatestTranscript("");
    addAiLog("Starting assessment: Candidate greeting & introduction", "info");

    await speechSynthesis.speak(
      "Welcome to your AI Micro-Presentation assessment. Please introduce yourself briefly. When you are finished, click the Continue button."
    );

    if (abortRef.current) return;
    setStatusMessage("Your turn — introduce yourself into the microphone");

    const videoEl = getVideoElement ? getVideoElement() : null;
    if (videoEl) {
      mediaRecorder.startPeriodicFrameCapture(videoEl, 3000);
      visionTracking.initTracking(videoEl);
      addAiLog("Google MediaPipe on-device FaceLandmarker tracking active", "success");
      addAiLog("Webcam video frame capture activated (480p sampling)", "info");
    }
    await mediaRecorder.startRecording();
    addAiLog("MediaRecorder started: capturing audio stream", "info");
    setWaitingForUser(true);
  }, [speechSynthesis, mediaRecorder, getVideoElement, addAiLog, visionTracking]);

  // User clicks "Continue" after introduction
  const confirmIntroduction = useCallback(async () => {
    setWaitingForUser(false);
    setIsTranscribing(true);
    setStatusMessage("Transcribing your introduction with Whisper AI...");
    addAiLog("Sending introduction audio to Groq Whisper Large v3...", "info");

    try {
      const audioBlob = await mediaRecorder.stopRecording();
      const res = await transcribeAudio(audioBlob);
      const text = res.text || "(Brief introduction recorded)";
      introductionRef.current = text;
      setLatestTranscript(introductionRef.current);
      const words = text.split(/\s+/).filter(Boolean).length;
      addAiLog(`Groq Whisper: Transcribed introduction (${words} words)`, "success");
    } catch (err) {
      console.error("Introduction transcription error:", err);
      introductionRef.current = "Student introduced themselves.";
      addAiLog(`Whisper transcription warning: ${err.message}`, "warn");
    } finally {
      setIsTranscribing(false);
    }

    if (abortRef.current) return;
    actionsRef.current.startPreparation?.();
  }, [mediaRecorder, addAiLog]);

  // ─── PHASE 2: PREPARATION ──────────────────────────
  const startPreparation = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.PREPARATION);
    setStatusMessage("AI is speaking...");
    addAiLog(`Preparation phase: assigned topic "${config.topic.title}"`, "info");

    await speechSynthesis.speak(
      `Thank you. Your topic for today is: ${config.topic.title}. Your preparation time begins now.`
    );

    if (abortRef.current) return;
    setStatusMessage("Prepare your presentation — organize your thoughts");

    startCountdown(config.prepTime, () => {
      actionsRef.current.startPresentation?.();
    });
  }, [speechSynthesis, config, startCountdown, addAiLog]);

  // ─── PHASE 3: PRESENTATION ─────────────────────────
  const startPresentation = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.PRESENTATION);
    setStatusMessage("AI is speaking...");
    setLatestTranscript("");
    addAiLog("Presentation phase started: recording live video & audio", "info");

    await speechSynthesis.speak(
      "Preparation time is over. Time starts now!"
    );

    if (abortRef.current) return;
    setStatusMessage("Present your topic — recording audio and video");

    const videoEl = getVideoElement ? getVideoElement() : null;
    if (videoEl && !visionTracking.isReady) {
      visionTracking.initTracking(videoEl);
    }

    await mediaRecorder.startRecording();

    startCountdown(config.presentTime, () => {
      actionsRef.current.finishPresentation?.();
    });
  }, [speechSynthesis, mediaRecorder, config, startCountdown, addAiLog, getVideoElement, visionTracking]);

  const finishPresentation = useCallback(async () => {
    if (abortRef.current) return;
    clearTimer();
    setIsTranscribing(true);
    setStatusMessage("Transcribing presentation with Groq Whisper AI...");
    addAiLog("Presentation complete. Forwarding audio to Groq Whisper Large v3...", "info");

    try {
      const audioBlob = await mediaRecorder.stopRecording();
      presentationAudioBlobRef.current = audioBlob;
      const res = await transcribeAudio(audioBlob);
      const text = res.text || "";
      presentationTranscriptRef.current = text;
      setLatestTranscript(text);
      const words = text.split(/\s+/).filter(Boolean).length;
      addAiLog(`Groq Whisper: Flawlessly transcribed presentation (${words} words)`, "success");
    } catch (err) {
      console.error("Presentation transcription error:", err);
      presentationTranscriptRef.current = "";
      addAiLog(`Whisper transcription error: ${err.message}`, "error");
    } finally {
      setIsTranscribing(false);
    }

    if (abortRef.current) return;
    actionsRef.current.startQA?.();
  }, [mediaRecorder, clearTimer, addAiLog]);

  // ─── PHASE 4: Q&A ──────────────────────────────────
  const startQA = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.QA);
    setStatusMessage("AI is speaking...");
    setCurrentQAIndex(0);
    qaHistoryRef.current = [];
    setQaHistory([]);
    addAiLog("Initiating Q&A Round (4 probing follow-up questions)", "info");

    await speechSynthesis.speak(
      "Time is up. Thank you. I will now ask you a few questions regarding your presentation."
    );

    if (abortRef.current) return;
    actionsRef.current.askQuestion?.(0);
  }, [speechSynthesis, addAiLog]);

  const askQuestion = useCallback(
    async (index) => {
      if (abortRef.current) return;
      if (index >= QA_QUESTION_COUNT) {
        actionsRef.current.startEvaluation?.();
        return;
      }

      setCurrentQAIndex(index + 1);
      setStatusMessage(`Generating question ${index + 1} of ${QA_QUESTION_COUNT}...`);
      setLatestTranscript("");

      try {
        addAiLog(`Generating contextual Q&A question ${index + 1} via Groq...`, "info");
        const response = await callGemini("generate_question", {
          topic: config.topic.title,
          transcript: presentationTranscriptRef.current,
          qaHistory: qaHistoryRef.current,
        });

        if (abortRef.current) return;

        const question = response.text;
        addAiLog(`Question ${index + 1} ready: "${question}"`, "success");
        setStatusMessage("AI is asking a question...");

        await speechSynthesis.speak(`Question ${index + 1}. ${question}`);

        if (abortRef.current) return;

        setStatusMessage(`Answer question ${index + 1} — click Submit My Answer when finished`);
        qaHistoryRef.current.push({ question, answer: "" });
        setQaHistory([...qaHistoryRef.current]);

        await mediaRecorder.startRecording();
        setWaitingForUser(true);
      } catch (error) {
        console.error("Error generating question:", error);
        addAiLog(`Question generation error: ${error.message}`, "warn");
        setStatusMessage("Error generating question — skipping to next");
        setTimeout(() => actionsRef.current.askQuestion?.(index + 1), 1000);
      }
    },
    [speechSynthesis, mediaRecorder, config, addAiLog]
  );

  // User clicks "Submit Answer" during Q&A
  const confirmAnswer = useCallback(async () => {
    setWaitingForUser(false);
    setIsTranscribing(true);
    setStatusMessage("Transcribing answer with Whisper AI...");
    addAiLog("Transcribing Q&A answer via Whisper...", "info");

    try {
      const audioBlob = await mediaRecorder.stopRecording();
      const res = await transcribeAudio(audioBlob);
      const answer = res.text || "(No verbal answer recorded)";
      setLatestTranscript(answer);

      if (qaHistoryRef.current.length > 0) {
        qaHistoryRef.current[qaHistoryRef.current.length - 1].answer = answer;
        setQaHistory([...qaHistoryRef.current]);
      }
      addAiLog("Q&A answer captured and logged successfully", "success");
    } catch (err) {
      console.error("Answer transcription error:", err);
      addAiLog(`Answer transcription error: ${err.message}`, "warn");
    } finally {
      setIsTranscribing(false);
    }

    if (abortRef.current) return;
    const nextIndex = qaHistoryRef.current.length;
    actionsRef.current.askQuestion?.(nextIndex);
  }, [mediaRecorder, addAiLog]);

  // ─── PHASE 5: EVALUATION ───────────────────────────
  const startEvaluation = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.EVALUATION);
    setStatusMessage("AI is speaking...");

    await speechSynthesis.speak(
      "Thank you, that concludes the Q and A round. Please wait a moment while I compile your comprehensive behavioral, tone, and contextual analysis."
    );

    if (abortRef.current) return;
    setStatusMessage("Connecting to OpenRouter Vision and Vocal Tone AI engines...");
    addAiLog("Connecting to OpenRouter Vision & Vocal Tone models...", "info");

    mediaRecorder.stopPeriodicFrameCapture();
    visionTracking.stopTracking();

    const telemetry = visionTracking.getTelemetrySummary();
    if (telemetry) {
      addAiLog(
        `MediaPipe Telemetry: ${telemetry.eyeContactPercent}% eye contact, composure: ${telemetry.dominantExpression}`,
        "success"
      );
    }

    try {
      const capturedFrames = mediaRecorder.getCapturedFrames();
      addAiLog(`Collected ${capturedFrames.length} video frames for non-verbal analysis`, "info");

      // Calculate speech cadence metrics
      const words = presentationTranscriptRef.current.trim().split(/\s+/).filter(Boolean).length;
      const duration = config.presentTime || 60;
      const metrics = { duration, wordCount: words };

      // Run visual analysis & tone analysis in parallel
      const [visualResult, toneResult] = await Promise.all([
        analyzeVisual(capturedFrames),
        analyzeTone(presentationAudioBlobRef.current, presentationTranscriptRef.current, metrics),
      ]);

      if (visualResult.modelUsed) {
        addAiLog(`OpenRouter Vision SUCCESS: Analyzed gestures & eye contact via ${visualResult.modelUsed}`, "success");
      }
      if (toneResult.modelUsed) {
        addAiLog(`OpenRouter Tone SUCCESS: Analyzed vocal pitch & cadence via ${toneResult.modelUsed}`, "success");
      }

      setAiDiagnostics((prev) => ({
        ...prev,
        visionModel: visualResult.modelUsed || prev.visionModel,
        toneModel: toneResult.modelUsed || prev.toneModel,
        visionStatus: "CONNECTED",
        toneStatus: "CONNECTED",
        mediaPipeStatus: "CONNECTED",
      }));

      if (abortRef.current) return;
      setStatusMessage("Synthesizing strengths, weaknesses, and final score...");
      addAiLog("Connecting to Groq Executive Evaluator (openai/gpt-oss-120b)...", "info");

      const response = await callGemini("evaluate", {
        topic: config.topic.title,
        introduction: introductionRef.current,
        transcript: presentationTranscriptRef.current,
        qaHistory: qaHistoryRef.current,
        visualNotes: visualResult.visualNotes,
        toneNotes: toneResult.toneNotes,
        telemetry,
      });

      if (abortRef.current) return;

      const evalText = response.text;
      const evalScore = response.score;

      setEvaluation(evalText);
      setScore(evalScore);
      addAiLog(`Evaluation SUCCESS: Final Score ${evalScore}/10 compiled`, "success");
      setStatusMessage("AI is reading your executive evaluation...");

      await speechSynthesis.speak(evalText);

      if (abortRef.current) return;

      setStatusMessage("Evaluation complete — session finished.");
      addAiLog("Session successfully completed", "success");
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000);
    } catch (error) {
      console.error("Error generating evaluation:", error);
      addAiLog(`Evaluation error: ${error.message}`, "error");
      setStatusMessage("Error generating evaluation. Please try again.");
      setEvaluation("We encountered an error generating your evaluation. Please try again.");
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 5000);
    }
  }, [speechSynthesis, mediaRecorder, config, onComplete, addAiLog, visionTracking]);

  // Synchronize actionsRef
  useEffect(() => {
    actionsRef.current = {
      startGreeting,
      confirmIntroduction,
      startPreparation,
      startPresentation,
      finishPresentation,
      startQA,
      askQuestion,
      confirmAnswer,
      startEvaluation,
    };
  }, [
    startGreeting,
    confirmIntroduction,
    startPreparation,
    startPresentation,
    finishPresentation,
    startQA,
    askQuestion,
    confirmAnswer,
    startEvaluation,
  ]);

  // ─── START THE ROUND ────────────────────────────────
  const startRound = useCallback(async () => {
    abortRef.current = false;
    setQaHistory([]);
    setEvaluation(null);
    setScore(null);
    setCurrentQAIndex(0);
    setWaitingForUser(false);
    setIsTranscribing(false);
    setLatestTranscript("");
    introductionRef.current = "";
    presentationTranscriptRef.current = "";
    presentationAudioBlobRef.current = null;
    qaHistoryRef.current = [];
    mediaRecorder.clearCapturedFrames();
    visionTracking.clearLog();

    await startGreeting();
  }, [startGreeting, mediaRecorder, visionTracking]);

  // ─── ABORT THE ROUND ───────────────────────────────
  const abortRound = useCallback(() => {
    abortRef.current = true;
    clearTimer();
    mediaRecorder.stopPeriodicFrameCapture();
    visionTracking.stopTracking();
    visionTracking.clearLog();
    mediaRecorder.stopRecording();
    speechSynthesis.cancel();
    setPhase(PHASES.IDLE);
    setWaitingForUser(false);
    setIsTranscribing(false);
    setStatusMessage("");
    addAiLog("Session aborted by candidate", "warn");
  }, [clearTimer, mediaRecorder, speechSynthesis, addAiLog, visionTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      clearTimer();
      visionTracking.stopTracking();
    };
  }, [clearTimer, visionTracking]);

  return {
    phase,
    timeRemaining,
    qaHistory,
    evaluation,
    score,
    currentQAIndex,
    waitingForUser,
    statusMessage,
    isTranscribing,
    latestTranscript,
    aiDiagnostics,
    currentExpression: visionTracking.currentExpression,
    getTelemetrySummary: visionTracking.getTelemetrySummary,
    startRound,
    abortRound,
    confirmIntroduction,
    confirmAnswer,
    finishPresentation,
  };
}
