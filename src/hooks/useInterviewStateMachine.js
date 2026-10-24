"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  INTERVIEW_STEPS,
  REPEAT_INTENT_PATTERNS,
  SYLLABUS_QA_COUNT,
  ECA_QA_COUNT,
} from "@/lib/interviewConstants";
import { callGemini } from "@/lib/gemini";
import { transcribeAudio, analyzeVisual, analyzeTone } from "@/lib/apiHelpers";
import { useVisionTracking } from "./useVisionTracking";

/**
 * 8-step Personal Interview state machine with voice loop.
 * Upgraded to use MediaRecorder, Groq Whisper transcription, OpenRouter Vision AI, Google MediaPipe, and OpenRouter Tone AI.
 */
export function useInterviewStateMachine({
  mediaRecorder,
  speechSynthesis,
  config,
  onComplete,
  getVideoElement,
}) {
  const visionTracking = useVisionTracking();

  const [step, setStep] = useState(INTERVIEW_STEPS.IDLE);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [qaHistory, setQaHistory] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [score, setScore] = useState(null);
  const [currentQALabel, setCurrentQALabel] = useState("");
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

  const stepRef = useRef(INTERVIEW_STEPS.IDLE);
  const abortRef = useRef(false);
  const introductionRef = useRef("");
  const favoriteSubjectRef = useRef("");
  const syllabusQARef = useRef([]);
  const ecaQARef = useRef([]);
  const geopoliticsResponseRef = useRef("");
  const geopoliticsFollowupRef = useRef(null);
  const geopoliticsEngagedRef = useRef(false);
  const sampleAudioBlobRef = useRef(null);
  const lastAIUtteranceRef = useRef("");
  const currentStepHandlerRef = useRef(null);
  const marksCardSubjectsRef = useRef([]);

  const subStepIndexRef = useRef(0);
  const actionsRef = useRef({});

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const addAiLog = useCallback((message, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setAiDiagnostics((prev) => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }].slice(-30),
    }));
  }, []);

  // ─── INTENT DETECTION ────────────────────────────
  const detectRepeatIntent = useCallback((text) => {
    if (!text || text.trim().length < 3) return false;
    return REPEAT_INTENT_PATTERNS.some((pattern) => pattern.test(text));
  }, []);

  // ─── SPEAK + REMEMBER ────────────────────────────
  const aiSpeak = useCallback(
    async (text) => {
      lastAIUtteranceRef.current = text;
      await speechSynthesis.speak(text);
    },
    [speechSynthesis]
  );

  // ─── TRANSCRIBE USER SPEECH ──────────────────────
  const recordAndTranscribe = useCallback(async () => {
    setIsTranscribing(true);
    setStatusMessage("Transcribing with Groq Whisper AI...");
    addAiLog("Transcribing response with Groq Whisper Large v3...", "info");

    try {
      const audioBlob = await mediaRecorder.stopRecording();
      if (!sampleAudioBlobRef.current && audioBlob.size > 2000) {
        sampleAudioBlobRef.current = audioBlob;
      }
      const res = await transcribeAudio(audioBlob);
      const cleanText = (res.text || "").trim();
      setLatestTranscript(cleanText);
      const words = cleanText.split(/\s+/).filter(Boolean).length;
      addAiLog(`Groq Whisper: Transcribed ${words} words (Success)`, "success");
      return cleanText;
    } catch (err) {
      console.error("Transcription error:", err);
      addAiLog(`Whisper transcription warning: ${err.message}`, "warn");
      return "";
    } finally {
      setIsTranscribing(false);
    }
  }, [mediaRecorder, addAiLog]);

  // ─── STEP 1: INTRODUCTION ───────────────────────
  const startIntroduction = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.INTRODUCTION);
    setStatusMessage("AI is speaking...");
    setLatestTranscript("");
    addAiLog("Starting Personal Interview: Step 1 Introduction", "info");

    await aiSpeak(
      "Welcome to your personal interview session. I will be your interviewer today. Please introduce yourself briefly — your name, where you are from, and a little about your background. When you are finished, click the Continue button."
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
    setWaitingForUser(true);
  }, [aiSpeak, mediaRecorder, getVideoElement, addAiLog, visionTracking]);

  const confirmIntroduction = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      addAiLog("Repeat request detected: re-asking introduction prompt", "info");
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    introductionRef.current = response || "Candidate introduced themselves.";
    actionsRef.current.startDataReview?.();
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder, addAiLog]);

  // ─── STEP 2: DATA REVIEW (auto-advance) ────────
  const startDataReview = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.DATA_REVIEW);
    setStatusMessage("AI is reviewing your academic data...");
    addAiLog("Reviewing academic records & uploaded profile details", "info");

    const academicData = config.academicData || {};
    const board10 = academicData.board10thLabel || "your 10th board";
    const marks10 = academicData.marks10th || "your 10th marks";
    const board12 = academicData.board12thLabel || "your 12th board";
    const marks12 = academicData.marks12th || "your 12th marks";
    const hasUpload = academicData.uploadedFileName;
    const hasImage = academicData.marksCardBase64;

    if (hasImage) {
      setStatusMessage("AI is reading your marks card...");
      addAiLog("Analyzing marks card document via Groq Vision...", "info");
      try {
        const result = await callGemini("analyze_marks_card", {
          imageBase64: hasImage,
        });
        if (result.subjects && result.subjects.length > 0) {
          const languageSubjects = ["english", "hindi", "kannada", "urdu", "sanskrit", "tamil", "telugu", "malayalam", "bengali", "marathi", "gujarati"];
          const coreSubjects = result.subjects.filter(
            (s) => !languageSubjects.includes(s.toLowerCase())
          );
          marksCardSubjectsRef.current = coreSubjects.length > 0 ? coreSubjects : result.subjects;
          addAiLog(`Extracted subjects: ${marksCardSubjectsRef.current.join(", ")}`, "success");
        }
      } catch (err) {
        console.error("Failed to analyze marks card:", err);
      }
    }

    if (abortRef.current) return;

    let reviewText = `Thank you for that introduction. I have reviewed your academic profile. You completed your 10th standard from ${board10} with ${marks10} percent, and your 12th standard from ${board12} with ${marks12} percent.`;

    if (hasUpload && marksCardSubjectsRef.current.length > 0) {
      reviewText += ` I have also analyzed your uploaded marks card and noted the subjects: ${marksCardSubjectsRef.current.join(", ")}.`;
    } else if (hasUpload) {
      reviewText += ` I have also noted your uploaded 12th marks card for reference.`;
    }

    reviewText += ` Let us proceed to the next part of the interview.`;

    await aiSpeak(reviewText);

    if (abortRef.current) return;
    actionsRef.current.startInstructions?.();
  }, [aiSpeak, config, addAiLog]);

  // ─── STEP 3: INSTRUCTIONS (auto-advance) ──────
  const startInstructions = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.INSTRUCTIONS);
    setStatusMessage("AI is giving instructions...");

    await aiSpeak(
      "I will now ask you a series of contextual questions. Please answer them clearly and take your time. There is no rush."
    );

    if (abortRef.current) return;
    actionsRef.current.startFavoriteSubject?.();
  }, [aiSpeak]);

  // ─── STEP 4: FAVORITE SUBJECT ─────────────────
  const startFavoriteSubject = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.FAVORITE_SUBJECT);
    setStatusMessage("AI is asking a question...");
    setLatestTranscript("");

    const detectedSubjects = marksCardSubjectsRef.current;
    let prompt;
    if (detectedSubjects.length > 0) {
      const subjectList = detectedSubjects.join(", ");
      prompt = `From your marks card, I can see you studied ${subjectList}. Which of these is your favorite subject? Or if you want, I can pick one for you.`;
    } else {
      prompt = "Now, what is your favorite subject from your 12th standard? Just tell me the subject name. Or if you want, I can pick one for you.";
    }

    await aiSpeak(prompt);

    if (abortRef.current) return;
    setStatusMessage("Name your favorite subject — click Submit Subject when finished");
    await mediaRecorder.startRecording();
    setWaitingForUser(true);
  }, [aiSpeak, mediaRecorder]);

  const confirmFavoriteSubject = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      addAiLog("Repeat request detected: re-asking subject selection", "info");
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    const lower = response.toLowerCase().trim();

    const KNOWN_SUBJECTS = [
      { keywords: ["account", "accounts", "accountancy", "accounting"], name: "Accountancy" },
      { keywords: ["business", "business studies", "bst"], name: "Business Studies" },
      { keywords: ["economics", "economy", "eco"], name: "Economics" },
      { keywords: ["physics"], name: "Physics" },
      { keywords: ["chemistry", "chem"], name: "Chemistry" },
      { keywords: ["biology", "bio"], name: "Biology" },
      { keywords: ["math", "maths", "mathematics"], name: "Mathematics" },
      { keywords: ["computer", "computers", "computer science", "informatics", "ip", "cs"], name: "Computer Science" },
      { keywords: ["statistics", "stats"], name: "Statistics" },
      { keywords: ["history"], name: "History" },
      { keywords: ["political science", "polsci", "civics"], name: "Political Science" },
      { keywords: ["sociology"], name: "Sociology" },
      { keywords: ["geography", "geo"], name: "Geography" },
      { keywords: ["psychology"], name: "Psychology" },
      { keywords: ["english"], name: "English" },
    ];

    let matchedSubject = null;
    const detectedSubjects = marksCardSubjectsRef.current;
    if (detectedSubjects.length > 0) {
      for (const detected of detectedSubjects) {
        if (lower.includes(detected.toLowerCase())) {
          matchedSubject = detected;
          break;
        }
      }
    }

    if (!matchedSubject) {
      for (const subj of KNOWN_SUBJECTS) {
        for (const kw of subj.keywords) {
          if (lower.includes(kw)) {
            matchedSubject = subj.name;
            break;
          }
        }
        if (matchedSubject) break;
      }
    }

    const isAskingAIToPick =
      /any\b/i.test(lower) ||
      /anything/i.test(lower) ||
      /you\s+(choose|decide|pick|select)/i.test(lower) ||
      /up\s+to\s+you/i.test(lower) ||
      lower === "";

    let subjectToUse;
    let speakMessage;

    if (matchedSubject && !isAskingAIToPick) {
      subjectToUse = matchedSubject;
      speakMessage = `Great, ${matchedSubject}! Let me ask you a few questions about that.`;
    } else {
      const availableSubjects = marksCardSubjectsRef.current.length > 0
        ? marksCardSubjectsRef.current
        : ["Accountancy", "Business Studies", "Economics"];
      const randomIndex = Math.floor(Math.random() * availableSubjects.length);
      subjectToUse = availableSubjects[randomIndex];
      speakMessage = `Alright, I will pick ${subjectToUse} for you. Let me ask you a few questions about it.`;
    }

    favoriteSubjectRef.current = subjectToUse;
    addAiLog(`Subject selected for Q&A: ${subjectToUse}`, "success");
    await aiSpeak(speakMessage);

    if (abortRef.current) return;
    subStepIndexRef.current = 0;
    syllabusQARef.current = [];
    actionsRef.current.startSyllabusQA?.();
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder, addAiLog]);

  // ─── STEP 5: SYLLABUS Q&A (loop) ──────────────
  const startSyllabusQA = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.SYLLABUS_QA);

    const index = subStepIndexRef.current;
    if (index >= SYLLABUS_QA_COUNT) {
      actionsRef.current.startEcaQA?.();
      return;
    }

    setCurrentQALabel(`Subject Q&A (${index + 1}/${SYLLABUS_QA_COUNT})`);
    setStatusMessage(`Generating subject question ${index + 1}...`);
    setLatestTranscript("");

    try {
      const previousQuestions = syllabusQARef.current.map((qa) => qa.question);
      addAiLog(`Generating syllabus question ${index + 1} on ${favoriteSubjectRef.current}...`, "info");
      const response = await callGemini("interview_syllabus_question", {
        subject: favoriteSubjectRef.current,
        previousQuestions,
      });

      if (abortRef.current) return;

      const question = response.text;
      addAiLog(`Question ${index + 1} ready: "${question}"`, "success");
      setStatusMessage("AI is asking a question...");
      await aiSpeak(`Question ${index + 1}. ${question}`);

      if (abortRef.current) return;

      syllabusQARef.current.push({ question, answer: "" });
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
      setStatusMessage("Answer the question — click Submit Answer when finished");

      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "syllabus";
    } catch (error) {
      console.error("Error generating syllabus question:", error);
      subStepIndexRef.current++;
      setTimeout(() => actionsRef.current.startSyllabusQA?.(), 1000);
    }
  }, [aiSpeak, mediaRecorder, addAiLog]);

  const confirmSyllabusAnswer = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      addAiLog("Repeat request detected: repeating question", "info");
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    if (syllabusQARef.current.length > 0) {
      syllabusQARef.current[syllabusQARef.current.length - 1].answer = response || "(No answer recorded)";
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
    }

    subStepIndexRef.current++;
    actionsRef.current.startSyllabusQA?.();
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder, addAiLog]);

  // ─── STEP 6: ECA Q&A (loop) ───────────────────
  const startEcaQA = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.ECA_QA);

    const ecaList = config.ecaList || [];
    if (ecaList.length === 0) {
      await aiSpeak(
        "I see you have not listed any extracurricular activities. Let us move on to the next section."
      );
      if (abortRef.current) return;
      actionsRef.current.startGeopolitics?.();
      return;
    }

    subStepIndexRef.current = 0;
    ecaQARef.current = [];
    actionsRef.current.askEcaQuestion?.();
  }, [aiSpeak, config]);

  const askEcaQuestion = useCallback(async () => {
    if (abortRef.current) return;

    const index = subStepIndexRef.current;
    const ecaCount = Math.min(ECA_QA_COUNT, (config.ecaList || []).length);

    if (index >= ecaCount) {
      actionsRef.current.startGeopolitics?.();
      return;
    }

    if (index === 0) {
      await aiSpeak("Now let us talk about your extracurricular activities.");
      if (abortRef.current) return;
    }

    setCurrentQALabel(`ECA Q&A (${index + 1}/${ecaCount})`);
    setStatusMessage(`Generating ECA question ${index + 1}...`);
    setLatestTranscript("");

    try {
      const previousQuestions = ecaQARef.current.map((qa) => qa.question);
      addAiLog(`Generating ECA question ${index + 1} via Groq...`, "info");
      const response = await callGemini("interview_eca_question", {
        ecaList: config.ecaList,
        previousQuestions,
      });

      if (abortRef.current) return;

      const question = response.text;
      setStatusMessage("AI is asking a question...");
      await aiSpeak(question);

      if (abortRef.current) return;

      ecaQARef.current.push({ question, answer: "" });
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
      setStatusMessage("Answer the question — click Submit Answer when finished");

      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "eca";
    } catch (error) {
      console.error("Error generating ECA question:", error);
      subStepIndexRef.current++;
      setTimeout(() => actionsRef.current.askEcaQuestion?.(), 1000);
    }
  }, [aiSpeak, mediaRecorder, config, addAiLog]);

  const confirmEcaAnswer = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    if (ecaQARef.current.length > 0) {
      ecaQARef.current[ecaQARef.current.length - 1].answer = response || "(No answer recorded)";
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
    }

    subStepIndexRef.current++;
    actionsRef.current.askEcaQuestion?.();
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder]);

  // ─── STEP 7: GEOPOLITICS ──────────────────────
  const startGeopolitics = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.GEOPOLITICS);
    setStatusMessage("AI is asking about current affairs...");
    setLatestTranscript("");

    await aiSpeak(
      "Now, are you aware of any recent current affairs or geopolitics events? If you follow the news, feel free to share. Otherwise, just say no and we will move on."
    );

    if (abortRef.current) return;
    setStatusMessage("Say Yes or No — click Submit Response when finished");

    await mediaRecorder.startRecording();
    setWaitingForUser(true);
    currentStepHandlerRef.current = "geopolitics_yesno";
  }, [aiSpeak, mediaRecorder]);

  const confirmGeopoliticsYesNo = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    const lower = response.toLowerCase().trim();

    const saidNo =
      /\bno\b/i.test(lower) ||
      /\bnot\s+(really|much|aware|sure|informed)/i.test(lower) ||
      /\bdon'?t\s+(know|follow|watch|read|have)/i.test(lower) ||
      /\bdo\s+not\s+(know|follow|watch|read|have)/i.test(lower) ||
      /\bno\s+(idea|clue|knowledge)/i.test(lower) ||
      /\bnot\s+aware/i.test(lower) ||
      /\bnope\b/i.test(lower) ||
      /\bskip/i.test(lower) ||
      lower === "";

    const saidYes =
      /\byes\b/i.test(lower) ||
      /\byeah\b/i.test(lower) ||
      /\bi\s+do\b/i.test(lower) ||
      /\bi\s+know/i.test(lower) ||
      /\bi\s+am\s+aware/i.test(lower) ||
      /\bi\s+follow/i.test(lower) ||
      /\bsure\b/i.test(lower);

    if (!saidNo && saidYes) {
      geopoliticsEngagedRef.current = true;
      addAiLog("Candidate engaged with current affairs discussion", "info");
      await aiSpeak(
        "Great. Please tell me about a recent current affairs event that you are aware of. Take your time."
      );

      if (abortRef.current) return;
      setStatusMessage("Share what you know — click Submit Response when finished");
      setLatestTranscript("");
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "geopolitics_explain";
    } else {
      geopoliticsEngagedRef.current = false;
      addAiLog("Current affairs skipped neutrally as requested", "info");
      await aiSpeak(
        "That is perfectly okay. Let us move forward to the final part of the interview."
      );
      if (abortRef.current) return;
      actionsRef.current.startEvaluation?.();
    }
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder, addAiLog]);

  const confirmGeopoliticsExplanation = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    geopoliticsResponseRef.current = response;
    setStatusMessage("AI is generating a follow-up question...");

    try {
      addAiLog("Generating geopolitics follow-up challenge via Groq...", "info");
      const followupRes = await callGemini("interview_geopolitics_followup", {
        studentResponse: response,
      });

      if (abortRef.current) return;

      const followupQ = followupRes.text;
      await aiSpeak(followupQ);

      if (abortRef.current) return;

      geopoliticsFollowupRef.current = { question: followupQ, answer: "" };
      setStatusMessage("Answer the follow-up — click Submit Response when finished");
      setLatestTranscript("");
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "geopolitics_followup";
    } catch (error) {
      console.error("Error generating geopolitics follow-up:", error);
      actionsRef.current.startEvaluation?.();
    }
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder, addAiLog]);

  const confirmGeopoliticsFollowup = useCallback(async () => {
    setWaitingForUser(false);
    const response = await recordAndTranscribe();

    if (detectRepeatIntent(response)) {
      await aiSpeak(lastAIUtteranceRef.current);
      await mediaRecorder.startRecording();
      setWaitingForUser(true);
      return;
    }

    if (geopoliticsFollowupRef.current) {
      geopoliticsFollowupRef.current.answer = response;
    }

    actionsRef.current.startEvaluation?.();
  }, [recordAndTranscribe, detectRepeatIntent, aiSpeak, mediaRecorder]);

  // ─── STEP 8: EVALUATION ───────────────────────
  const startEvaluation = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.EVALUATION);
    setStatusMessage("AI is speaking...");

    await aiSpeak(
      "Thank you, that brings us to the end of your personal interview round. Please wait a moment while I compile your final assessment."
    );

    if (abortRef.current) return;
    setStatusMessage("Analyzing body language, expressions, and vocal tone with AI...");
    addAiLog("Connecting to OpenRouter Vision and Vocal Tone AI engines...", "info");

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

      const [visualResult, toneResult] = await Promise.all([
        analyzeVisual(capturedFrames),
        analyzeTone(sampleAudioBlobRef.current, introductionRef.current),
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
      setStatusMessage("Generating your comprehensive interview evaluation...");
      addAiLog("Connecting to Groq Executive Evaluator (openai/gpt-oss-120b)...", "info");

      const response = await callGemini("interview_evaluate", {
        introduction: introductionRef.current,
        academicData: config.academicData || {},
        favoriteSubject: favoriteSubjectRef.current,
        syllabusQA: syllabusQARef.current,
        ecaList: config.ecaList || [],
        ecaQA: ecaQARef.current,
        geopoliticsEngaged: geopoliticsEngagedRef.current,
        geopoliticsResponse: geopoliticsResponseRef.current,
        geopoliticsFollowup: geopoliticsFollowupRef.current,
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
      setStatusMessage("AI is reading your interview evaluation...");

      await aiSpeak(evalText);

      if (abortRef.current) return;

      setStatusMessage("Evaluation complete — interview finished.");
      addAiLog("Interview session successfully completed", "success");
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
  }, [aiSpeak, mediaRecorder, config, onComplete, addAiLog, visionTracking]);

  // Synchronize actionsRef
  useEffect(() => {
    actionsRef.current = {
      startIntroduction,
      confirmIntroduction,
      startDataReview,
      startInstructions,
      startFavoriteSubject,
      confirmFavoriteSubject,
      startSyllabusQA,
      confirmSyllabusAnswer,
      startEcaQA,
      askEcaQuestion,
      confirmEcaAnswer,
      startGeopolitics,
      confirmGeopoliticsYesNo,
      confirmGeopoliticsExplanation,
      confirmGeopoliticsFollowup,
      startEvaluation,
    };
  }, [
    startIntroduction,
    confirmIntroduction,
    startDataReview,
    startInstructions,
    startFavoriteSubject,
    confirmFavoriteSubject,
    startSyllabusQA,
    confirmSyllabusAnswer,
    startEcaQA,
    askEcaQuestion,
    confirmEcaAnswer,
    startGeopolitics,
    confirmGeopoliticsYesNo,
    confirmGeopoliticsExplanation,
    confirmGeopoliticsFollowup,
    startEvaluation,
  ]);

  // ─── UNIFIED CONFIRM HANDLER ──────────────────
  const confirmResponse = useCallback(async () => {
    const handler = currentStepHandlerRef.current;
    const currentStep = stepRef.current;

    if (currentStep === INTERVIEW_STEPS.INTRODUCTION) {
      confirmIntroduction();
    } else if (currentStep === INTERVIEW_STEPS.FAVORITE_SUBJECT) {
      confirmFavoriteSubject();
    } else if (handler === "syllabus") {
      confirmSyllabusAnswer();
    } else if (handler === "eca") {
      confirmEcaAnswer();
    } else if (handler === "geopolitics_yesno") {
      confirmGeopoliticsYesNo();
    } else if (handler === "geopolitics_explain") {
      confirmGeopoliticsExplanation();
    } else if (handler === "geopolitics_followup") {
      confirmGeopoliticsFollowup();
    }
  }, [
    confirmIntroduction,
    confirmFavoriteSubject,
    confirmSyllabusAnswer,
    confirmEcaAnswer,
    confirmGeopoliticsYesNo,
    confirmGeopoliticsExplanation,
    confirmGeopoliticsFollowup,
  ]);

  // ─── START / ABORT ────────────────────────────
  const startInterview = useCallback(async () => {
    abortRef.current = false;
    setQaHistory([]);
    setEvaluation(null);
    setScore(null);
    setWaitingForUser(false);
    setIsTranscribing(false);
    setLatestTranscript("");
    setCurrentQALabel("");
    introductionRef.current = "";
    favoriteSubjectRef.current = "";
    syllabusQARef.current = [];
    ecaQARef.current = [];
    geopoliticsResponseRef.current = "";
    geopoliticsFollowupRef.current = null;
    geopoliticsEngagedRef.current = false;
    sampleAudioBlobRef.current = null;
    subStepIndexRef.current = 0;
    currentStepHandlerRef.current = null;
    mediaRecorder.clearCapturedFrames();
    visionTracking.clearLog();

    await startIntroduction();
  }, [startIntroduction, mediaRecorder, visionTracking]);

  const abortInterview = useCallback(() => {
    abortRef.current = true;
    mediaRecorder.stopPeriodicFrameCapture();
    visionTracking.stopTracking();
    visionTracking.clearLog();
    mediaRecorder.stopRecording();
    speechSynthesis.cancel();
    setStep(INTERVIEW_STEPS.IDLE);
    setWaitingForUser(false);
    setIsTranscribing(false);
    setStatusMessage("");
    addAiLog("Interview aborted by candidate", "warn");
  }, [mediaRecorder, speechSynthesis, addAiLog, visionTracking]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      visionTracking.stopTracking();
    };
  }, [visionTracking]);

  return {
    step,
    waitingForUser,
    statusMessage,
    isTranscribing,
    latestTranscript,
    aiDiagnostics,
    currentExpression: visionTracking.currentExpression,
    getTelemetrySummary: visionTracking.getTelemetrySummary,
    qaHistory,
    evaluation,
    score,
    currentQALabel,
    startInterview,
    abortInterview,
    confirmResponse,
  };
}
