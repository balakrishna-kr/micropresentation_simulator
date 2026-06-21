"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  INTERVIEW_STEPS,
  REPEAT_INTENT_PATTERNS,
  SYLLABUS_QA_COUNT,
  ECA_QA_COUNT,
} from "@/lib/interviewConstants";
import { summarizeVisionLog } from "@/lib/visionSummarizer";
import { callGemini } from "@/lib/gemini";

/**
 * 8-step Personal Interview state machine with Copilot-style voice loop.
 * Coordinates speech recognition, TTS, vision tracking, and Groq API.
 */
export function useInterviewStateMachine({
  speechRecognition,
  speechSynthesis,
  visionTracking,
  config,
  onComplete,
}) {
  const [step, setStep] = useState(INTERVIEW_STEPS.IDLE);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [qaHistory, setQaHistory] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [score, setScore] = useState(null);
  const [currentQALabel, setCurrentQALabel] = useState("");

  const stepRef = useRef(INTERVIEW_STEPS.IDLE);
  const abortRef = useRef(false);
  const introductionRef = useRef("");
  const favoriteSubjectRef = useRef("");
  const syllabusQARef = useRef([]);
  const ecaQARef = useRef([]);
  const geopoliticsResponseRef = useRef("");
  const geopoliticsFollowupRef = useRef(null);
  const geopoliticsEngagedRef = useRef(false);
  const lastAIUtteranceRef = useRef("");
  const currentStepHandlerRef = useRef(null);
  const marksCardSubjectsRef = useRef([]);  // subjects extracted from marks card image

  // Track sub-step for multi-question steps
  const subStepIndexRef = useRef(0);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

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

  // ─── HANDLE USER RESPONSE WITH REPEAT CHECK ─────
  const getUserResponse = useCallback(() => {
    // Use getFullTranscript to include any pending interim speech
    // This prevents answers from being lost when the user clicks Continue
    // before the browser finalizes the last speech chunk
    const transcript = speechRecognition.getFullTranscript();
    return transcript.trim();
  }, [speechRecognition]);

  // ─── STEP 1: INTRODUCTION ───────────────────────
  const startIntroduction = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.INTRODUCTION);
    setStatusMessage("AI is speaking...");

    await aiSpeak(
      "Welcome to your personal interview session. I will be your interviewer today. Please introduce yourself briefly — your name, where you are from, and a little about your background. When you are finished, click the Continue button."
    );

    if (abortRef.current) return;
    setStatusMessage("Your turn — introduce yourself");
    speechRecognition.resetTranscript();
    speechRecognition.start();
    setWaitingForUser(true);
  }, [aiSpeak, speechRecognition]);

  const confirmIntroduction = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    introductionRef.current = response;
    startDataReview();
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak]);

  // ─── STEP 2: DATA REVIEW (auto-advance) ────────
  const startDataReview = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.DATA_REVIEW);
    setStatusMessage("AI is reviewing your academic data...");

    const academicData = config.academicData || {};
    const board10 = academicData.board10thLabel || "your 10th board";
    const marks10 = academicData.marks10th || "your 10th marks";
    const board12 = academicData.board12thLabel || "your 12th board";
    const marks12 = academicData.marks12th || "your 12th marks";
    const hasUpload = academicData.uploadedFileName;
    const hasImage = academicData.marksCardBase64;

    // If marks card image was uploaded, analyze it with the vision AI
    if (hasImage) {
      setStatusMessage("A.I. is reading your marks card...");
      try {
        const result = await callGemini("analyze_marks_card", {
          imageBase64: hasImage,
        });
        if (result.subjects && result.subjects.length > 0) {
          // Filter out language subjects — keep only core academic subjects for Q&A
          const languageSubjects = ["english", "hindi", "kannada", "urdu", "sanskrit", "tamil", "telugu", "malayalam", "bengali", "marathi", "gujarati"];
          const coreSubjects = result.subjects.filter(
            (s) => !languageSubjects.includes(s.toLowerCase())
          );
          marksCardSubjectsRef.current = coreSubjects.length > 0 ? coreSubjects : result.subjects;
          console.log("Detected subjects from marks card:", marksCardSubjectsRef.current);
        }
      } catch (err) {
        console.error("Failed to analyze marks card:", err);
        // Continue without extracted subjects — fallback subjects will be used
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
    startInstructions();
  }, [aiSpeak, config]);

  // ─── STEP 3: INSTRUCTIONS (auto-advance) ──────
  const startInstructions = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.INSTRUCTIONS);
    setStatusMessage("AI is giving instructions...");

    await aiSpeak(
      "I will now ask you a series of contextual questions. Please answer them clearly and take your time. There is no rush."
    );

    if (abortRef.current) return;
    startFavoriteSubject();
  }, [aiSpeak]);

  // ─── STEP 4: FAVORITE SUBJECT ─────────────────
  const startFavoriteSubject = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.FAVORITE_SUBJECT);
    setStatusMessage("AI is asking a question...");

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
    setStatusMessage("Name your favorite subject — click Continue when done");
    speechRecognition.resetTranscript();
    speechRecognition.start();
    setWaitingForUser(true);
  }, [aiSpeak, speechRecognition]);

  const confirmFavoriteSubject = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    const lower = response.toLowerCase().trim();

    // Known 12th standard subjects for smart matching (all streams)
    const KNOWN_SUBJECTS = [
      // Commerce
      { keywords: ["account", "accounts", "accountancy", "accounting"], name: "Accountancy" },
      { keywords: ["business", "business studies", "bst"], name: "Business Studies" },
      { keywords: ["economics", "economy", "eco"], name: "Economics" },
      // Science
      { keywords: ["physics"], name: "Physics" },
      { keywords: ["chemistry", "chem"], name: "Chemistry" },
      { keywords: ["biology", "bio"], name: "Biology" },
      // Common
      { keywords: ["math", "maths", "mathematics"], name: "Mathematics" },
      { keywords: ["computer", "computers", "computer science", "informatics", "ip", "cs"], name: "Computer Science" },
      { keywords: ["statistics", "stats"], name: "Statistics" },
      // Arts / Humanities
      { keywords: ["history"], name: "History" },
      { keywords: ["political science", "polsci", "civics"], name: "Political Science" },
      { keywords: ["sociology"], name: "Sociology" },
      { keywords: ["geography", "geo"], name: "Geography" },
      { keywords: ["psychology"], name: "Psychology" },
      { keywords: ["philosophy"], name: "Philosophy" },
      // Languages (in case they pick one)
      { keywords: ["english"], name: "English" },
      { keywords: ["hindi"], name: "Hindi" },
      { keywords: ["kannada"], name: "Kannada" },
    ];

    // First priority: match against subjects detected from the marks card
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

    // Second priority: match against known subject keywords
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

    // Detect if student is asking the AI to pick for them
    const isAskingAIToPick =
      /any\b/i.test(lower) ||
      /anything/i.test(lower) ||
      /marks\s*card/i.test(lower) ||
      /you\s+(choose|decide|pick|select)/i.test(lower) ||
      /your\s+(choice|pick)/i.test(lower) ||
      /ask\s+(from|about)\s+any/i.test(lower) ||
      /whichever/i.test(lower) ||
      /whatever/i.test(lower) ||
      /don'?t\s+(mind|care)/i.test(lower) ||
      /up\s+to\s+you/i.test(lower) ||
      lower === "";

    let subjectToUse;
    let speakMessage;

    if (matchedSubject && !isAskingAIToPick) {
      // Student clearly named a subject
      subjectToUse = matchedSubject;
      speakMessage = `Great, ${matchedSubject}! Let me ask you a few questions about that.`;
    } else if (isAskingAIToPick || !matchedSubject) {
      // Use subjects detected from marks card, or fall back to commerce defaults
      const availableSubjects = marksCardSubjectsRef.current.length > 0
        ? marksCardSubjectsRef.current
        : ["Accountancy", "Business Studies", "Economics"];
      const randomIndex = Math.floor(Math.random() * availableSubjects.length);
      subjectToUse = availableSubjects[randomIndex];
      speakMessage = `Alright, I will pick ${subjectToUse} for you. Let me ask you a few questions about it.`;
    }

    favoriteSubjectRef.current = subjectToUse;
    await aiSpeak(speakMessage);

    if (abortRef.current) return;
    subStepIndexRef.current = 0;
    syllabusQARef.current = [];
    startSyllabusQA();
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak]);

  // ─── STEP 5: SYLLABUS Q&A (loop) ──────────────
  const startSyllabusQA = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.SYLLABUS_QA);

    const index = subStepIndexRef.current;
    if (index >= SYLLABUS_QA_COUNT) {
      startEcaQA();
      return;
    }

    setCurrentQALabel(`Subject Q&A (${index + 1}/${SYLLABUS_QA_COUNT})`);
    setStatusMessage(`Generating subject question ${index + 1}...`);

    try {
      const previousQuestions = syllabusQARef.current.map((qa) => qa.question);
      const response = await callGemini("interview_syllabus_question", {
        subject: favoriteSubjectRef.current,
        previousQuestions,
      });

      if (abortRef.current) return;

      const question = response.text;
      setStatusMessage("AI is asking a question...");
      await aiSpeak(`Question ${index + 1}. ${question}`);

      if (abortRef.current) return;

      syllabusQARef.current.push({ question, answer: "" });
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
      setStatusMessage("Answer the question — click Continue when done");
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "syllabus";
    } catch (error) {
      console.error("Error generating syllabus question:", error);
      setStatusMessage("Error generating question — skipping...");
      subStepIndexRef.current++;
      setTimeout(() => startSyllabusQA(), 1000);
    }
  }, [aiSpeak, speechRecognition]);

  const confirmSyllabusAnswer = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    // Update last entry
    if (syllabusQARef.current.length > 0) {
      syllabusQARef.current[syllabusQARef.current.length - 1].answer = response;
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
    }

    subStepIndexRef.current++;
    startSyllabusQA();
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak, startSyllabusQA]);

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
      startGeopolitics();
      return;
    }

    subStepIndexRef.current = 0;
    ecaQARef.current = [];
    askEcaQuestion();
  }, [aiSpeak, config]);

  const askEcaQuestion = useCallback(async () => {
    if (abortRef.current) return;

    const index = subStepIndexRef.current;
    const ecaCount = Math.min(ECA_QA_COUNT, (config.ecaList || []).length);

    if (index >= ecaCount) {
      startGeopolitics();
      return;
    }

    if (index === 0) {
      await aiSpeak(
        "Now let us talk about your extracurricular activities."
      );
      if (abortRef.current) return;
    }

    setCurrentQALabel(`ECA Q&A (${index + 1}/${ecaCount})`);
    setStatusMessage(`Generating ECA question ${index + 1}...`);

    try {
      const previousQuestions = ecaQARef.current.map((qa) => qa.question);
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
      setStatusMessage("Answer the question — click Continue when done");
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "eca";
    } catch (error) {
      console.error("Error generating ECA question:", error);
      subStepIndexRef.current++;
      setTimeout(() => askEcaQuestion(), 1000);
    }
  }, [aiSpeak, speechRecognition, config]);

  const confirmEcaAnswer = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    if (ecaQARef.current.length > 0) {
      ecaQARef.current[ecaQARef.current.length - 1].answer = response;
      setQaHistory([...syllabusQARef.current, ...ecaQARef.current]);
    }

    subStepIndexRef.current++;
    askEcaQuestion();
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak, askEcaQuestion]);

  // ─── STEP 7: GEOPOLITICS ──────────────────────
  const startGeopolitics = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.GEOPOLITICS);
    setStatusMessage("AI is asking about current affairs...");

    await aiSpeak(
      "Now, are you aware of any recent current affairs or geopolitics events? If you follow the news, feel free to share. Otherwise, just say no and we will move on."
    );

    if (abortRef.current) return;
    setStatusMessage("Say Yes or No — click Continue when done");
    speechRecognition.resetTranscript();
    speechRecognition.start();
    setWaitingForUser(true);
    currentStepHandlerRef.current = "geopolitics_yesno";
  }, [aiSpeak, speechRecognition]);

  const confirmGeopoliticsYesNo = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    const lower = response.toLowerCase().trim();

    // Detect NEGATIVE intent first (must check before positive to avoid false matches like "I am not aware")
    const saidNo =
      /\bno\b/i.test(lower) ||
      /\bnot\s+(really|much|aware|sure|informed)/i.test(lower) ||
      /\bdon'?t\s+(know|follow|watch|read|have)/i.test(lower) ||
      /\bdo\s+not\s+(know|follow|watch|read|have)/i.test(lower) ||
      /\bno\s+(idea|clue|knowledge)/i.test(lower) ||
      /\bi\s+am\s+not/i.test(lower) ||
      /\bi'?m\s+not/i.test(lower) ||
      /\bnot\s+aware/i.test(lower) ||
      /\bnothing/i.test(lower) ||
      /\bnah\b/i.test(lower) ||
      /\bnope\b/i.test(lower) ||
      /\bno\s+sir\b/i.test(lower) ||
      /\bno\s+ma'?am\b/i.test(lower) ||
      /\bskip/i.test(lower) ||
      /\bnever\s+(follow|watch|read)/i.test(lower) ||
      lower === "";

    // Detect POSITIVE intent
    const saidYes =
      /\byes\b/i.test(lower) ||
      /\byeah\b/i.test(lower) ||
      /\bi\s+do\b/i.test(lower) ||
      /\bi\s+know/i.test(lower) ||
      /\bi\s+am\s+aware/i.test(lower) ||
      /\bi\s+follow/i.test(lower) ||
      /\bof\s+course/i.test(lower) ||
      /\bsure\b/i.test(lower) ||
      /\bdefinitely/i.test(lower);

    if (!saidNo && saidYes) {
      geopoliticsEngagedRef.current = true;
      await aiSpeak(
        "Great. Please tell me about a recent current affairs event that you are aware of. Take your time."
      );

      if (abortRef.current) return;
      setStatusMessage("Share what you know — click Continue when done");
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "geopolitics_explain";
    } else {
      // Default: skip current affairs
      geopoliticsEngagedRef.current = false;
      await aiSpeak(
        "That is perfectly okay. Let us move forward to the final part of the interview."
      );
      if (abortRef.current) return;
      startEvaluation();
    }
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak]);

  const confirmGeopoliticsExplanation = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    geopoliticsResponseRef.current = response;
    setStatusMessage("AI is generating a follow-up question...");

    try {
      const followupRes = await callGemini("interview_geopolitics_followup", {
        studentResponse: response,
      });

      if (abortRef.current) return;

      const followupQ = followupRes.text;
      await aiSpeak(followupQ);

      if (abortRef.current) return;

      geopoliticsFollowupRef.current = { question: followupQ, answer: "" };
      setStatusMessage("Answer the follow-up — click Continue when done");
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      currentStepHandlerRef.current = "geopolitics_followup";
    } catch (error) {
      console.error("Error generating geopolitics follow-up:", error);
      startEvaluation();
    }
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak]);

  const confirmGeopoliticsFollowup = useCallback(async () => {
    setWaitingForUser(false);
    const response = getUserResponse();
    speechRecognition.stop();

    if (detectRepeatIntent(response)) {
      speechRecognition.resetTranscript();
      speechRecognition.start();
      setWaitingForUser(true);
      await aiSpeak(lastAIUtteranceRef.current);
      return;
    }

    if (geopoliticsFollowupRef.current) {
      geopoliticsFollowupRef.current.answer = response;
    }

    startEvaluation();
  }, [getUserResponse, speechRecognition, detectRepeatIntent, aiSpeak]);

  // ─── STEP 8: EVALUATION ───────────────────────
  const startEvaluation = useCallback(async () => {
    if (abortRef.current) return;
    setStep(INTERVIEW_STEPS.EVALUATION);
    setStatusMessage("AI is speaking...");

    await aiSpeak(
      "Thank you, that brings us to the end of your personal interview round. Please wait a moment while I compile your final assessment."
    );

    if (abortRef.current) return;
    setStatusMessage("Generating your evaluation — please wait...");

    try {
      const visionLogs = visionTracking.getAnalyticsLog();
      const visionSummary = summarizeVisionLog(visionLogs);

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
        visionSummary,
      });

      if (abortRef.current) return;

      const evalText = response.text;
      const evalScore = response.score;

      setEvaluation(evalText);
      setScore(evalScore);
      setStatusMessage("AI is reading your evaluation...");

      await aiSpeak(evalText);

      if (abortRef.current) return;

      setStatusMessage("Evaluation complete — redirecting...");
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000);
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
  }, [aiSpeak, visionTracking, config, onComplete]);

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
  const startInterview = useCallback(() => {
    abortRef.current = false;
    setQaHistory([]);
    setEvaluation(null);
    setScore(null);
    setWaitingForUser(false);
    setCurrentQALabel("");
    introductionRef.current = "";
    favoriteSubjectRef.current = "";
    syllabusQARef.current = [];
    ecaQARef.current = [];
    geopoliticsResponseRef.current = "";
    geopoliticsFollowupRef.current = null;
    geopoliticsEngagedRef.current = false;
    subStepIndexRef.current = 0;
    currentStepHandlerRef.current = null;

    startIntroduction();
  }, [startIntroduction]);

  const abortInterview = useCallback(() => {
    abortRef.current = true;
    speechRecognition.stop();
    speechSynthesis.cancel();
    setStep(INTERVIEW_STEPS.IDLE);
    setWaitingForUser(false);
    setStatusMessage("");
  }, [speechRecognition, speechSynthesis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return {
    step,
    waitingForUser,
    statusMessage,
    qaHistory,
    evaluation,
    score,
    currentQALabel,
    startInterview,
    abortInterview,
    confirmResponse,
    transcript: speechRecognition.transcript,
    interimText: speechRecognition.interimText,
  };
}
