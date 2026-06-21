"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { PHASES, QA_QUESTION_COUNT } from "@/lib/constants";
import { callGemini } from "@/lib/gemini";

/**
 * Central orchestrator implementing the 5-phase micro-presentation flow.
 * Coordinates speech recognition, speech synthesis, vision tracking, and Gemini API.
 */
export function useRoundStateMachine({
  speechRecognition,
  speechSynthesis,
  visionTracking,
  config,
  onComplete,
}) {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [qaHistory, setQaHistory] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [score, setScore] = useState(null);
  const [currentQAIndex, setCurrentQAIndex] = useState(0);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const timerRef = useRef(null);
  const introductionRef = useRef("");
  const presentationTranscriptRef = useRef("");
  const qaHistoryRef = useRef([]);
  const phaseRef = useRef(PHASES.IDLE);
  const abortRef = useRef(false);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Start a countdown timer. Calls onComplete when it hits 0.
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

    await speechSynthesis.speak(
      "Welcome to your AI Micro-Presentation assessment. Please introduce yourself briefly. When you are finished, click the Continue button."
    );

    if (abortRef.current) return;
    setStatusMessage("Your turn — introduce yourself");

    // Start listening for introduction
    speechRecognition.resetTranscript();
    speechRecognition.start();
    setWaitingForUser(true);
  }, [speechSynthesis, speechRecognition]);

  // User clicks "Continue" after introduction
  const confirmIntroduction = useCallback(async () => {
    setWaitingForUser(false);
    speechRecognition.stop();
    introductionRef.current = speechRecognition.getFullTranscript();

    // Move to preparation
    startPreparation();
  }, [speechRecognition]);

  // ─── PHASE 2: PREPARATION ──────────────────────────
  const startPreparation = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.PREPARATION);
    setStatusMessage("AI is speaking...");

    await speechSynthesis.speak(
      `Thank you. Your topic for today is: ${config.topic.title}. Your preparation time begins now.`
    );

    if (abortRef.current) return;
    setStatusMessage("Prepare your presentation — silence mode");

    // Start preparation countdown
    startCountdown(config.prepTime, () => {
      startPresentation();
    });
  }, [speechSynthesis, config, startCountdown]);

  // ─── PHASE 3: PRESENTATION ─────────────────────────
  const startPresentation = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.PRESENTATION);
    setStatusMessage("AI is speaking...");

    await speechSynthesis.speak(
      "Preparation time is over. Time starts now!"
    );

    if (abortRef.current) return;
    setStatusMessage("Present your topic — you are being recorded");

    // Start STT for presentation capture
    speechRecognition.resetTranscript();
    speechRecognition.start();

    // Start presentation countdown
    startCountdown(config.presentTime, () => {
      startQA();
    });
  }, [speechSynthesis, speechRecognition, config, startCountdown]);

  // ─── PHASE 4: Q&A ──────────────────────────────────
  const startQA = useCallback(async () => {
    if (abortRef.current) return;

    // Capture the presentation transcript before stopping
    presentationTranscriptRef.current = speechRecognition.getFullTranscript();
    speechRecognition.stop();

    setPhase(PHASES.QA);
    setStatusMessage("AI is speaking...");
    setCurrentQAIndex(0);
    qaHistoryRef.current = [];
    setQaHistory([]);

    await speechSynthesis.speak(
      "Time is up. Thank you. I will now ask you a few questions regarding your presentation."
    );

    if (abortRef.current) return;

    // Start the Q&A loop
    await askQuestion(0);
  }, [speechSynthesis, speechRecognition]);

  const askQuestion = useCallback(
    async (index) => {
      if (abortRef.current) return;
      if (index >= QA_QUESTION_COUNT) {
        // All questions done — move to evaluation
        startEvaluation();
        return;
      }

      setCurrentQAIndex(index + 1);
      setStatusMessage(`Generating question ${index + 1} of ${QA_QUESTION_COUNT}...`);

      try {
        // Call Gemini to generate a question
        const response = await callGemini("generate_question", {
          topic: config.topic.title,
          transcript: presentationTranscriptRef.current,
          qaHistory: qaHistoryRef.current,
        });

        if (abortRef.current) return;

        const question = response.text;
        setStatusMessage("AI is asking a question...");

        // Speak the question
        await speechSynthesis.speak(`Question ${index + 1}. ${question}`);

        if (abortRef.current) return;

        // Listen for answer
        setStatusMessage(`Answer question ${index + 1} — click Continue when done`);
        speechRecognition.resetTranscript();
        speechRecognition.start();
        setWaitingForUser(true);

        // Store question — answer will be filled when user confirms
        qaHistoryRef.current.push({ question, answer: "" });
        setQaHistory([...qaHistoryRef.current]);

        // The flow continues when the user clicks confirmAnswer
      } catch (error) {
        console.error("Error generating question:", error);
        setStatusMessage("Error generating question — skipping to next");

        // Skip to next question on error
        setTimeout(() => askQuestion(index + 1), 1000);
      }
    },
    [speechSynthesis, speechRecognition, config]
  );

  // User clicks "Continue" / "Submit Answer" during Q&A
  const confirmAnswer = useCallback(async () => {
    setWaitingForUser(false);
    const answer = speechRecognition.getFullTranscript();
    speechRecognition.stop();

    // Update the last Q&A entry with the answer
    if (qaHistoryRef.current.length > 0) {
      qaHistoryRef.current[qaHistoryRef.current.length - 1].answer = answer;
      setQaHistory([...qaHistoryRef.current]);
    }

    // Ask the next question
    const nextIndex = qaHistoryRef.current.length;
    await askQuestion(nextIndex);
  }, [speechRecognition, askQuestion]);

  // ─── PHASE 5: EVALUATION ───────────────────────────
  const startEvaluation = useCallback(async () => {
    if (abortRef.current) return;
    setPhase(PHASES.EVALUATION);
    setStatusMessage("AI is speaking...");

    await speechSynthesis.speak(
      "Thank you, that concludes the Q and A round. Please wait a moment while I compile your behavioral and contextual analysis."
    );

    if (abortRef.current) return;
    setStatusMessage("Generating evaluation — please wait...");

    try {
      const visionLogs = visionTracking.getAnalyticsLog();

      const response = await callGemini("evaluate", {
        topic: config.topic.title,
        introduction: introductionRef.current,
        transcript: presentationTranscriptRef.current,
        qaHistory: qaHistoryRef.current,
        visionLogs,
      });

      if (abortRef.current) return;

      const evalText = response.text;
      const evalScore = response.score;

      setEvaluation(evalText);
      setScore(evalScore);
      setStatusMessage("AI is reading your evaluation...");

      // Read out the evaluation
      await speechSynthesis.speak(evalText);

      if (abortRef.current) return;

      // Auto-reset after evaluation is read
      setStatusMessage("Evaluation complete — redirecting...");
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
    } catch (error) {
      console.error("Error generating evaluation:", error);
      setStatusMessage("Error generating evaluation. Please try again.");
      setEvaluation(
        "We encountered an error generating your evaluation. Please try again."
      );
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 5000);
    }
  }, [speechSynthesis, visionTracking, config, onComplete]);

  // ─── START THE ROUND ────────────────────────────────
  const startRound = useCallback(() => {
    abortRef.current = false;
    setQaHistory([]);
    setEvaluation(null);
    setScore(null);
    setCurrentQAIndex(0);
    setWaitingForUser(false);
    introductionRef.current = "";
    presentationTranscriptRef.current = "";
    qaHistoryRef.current = [];

    startGreeting();
  }, [startGreeting]);

  // ─── ABORT THE ROUND ───────────────────────────────
  const abortRound = useCallback(() => {
    abortRef.current = true;
    clearTimer();
    speechRecognition.stop();
    speechSynthesis.cancel();
    setPhase(PHASES.IDLE);
    setWaitingForUser(false);
    setStatusMessage("");
  }, [clearTimer, speechRecognition, speechSynthesis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      clearTimer();
    };
  }, [clearTimer]);

  return {
    phase,
    timeRemaining,
    qaHistory,
    evaluation,
    score,
    currentQAIndex,
    waitingForUser,
    statusMessage,
    startRound,
    abortRound,
    confirmIntroduction,
    confirmAnswer,
    transcript: speechRecognition.transcript,
    interimText: speechRecognition.interimText,
  };
}
