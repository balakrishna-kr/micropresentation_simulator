"use client";
import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Normalizes text to ensure natural, flawless pronunciation by browser speech synthesis engines.
 * Fixes awkward pronunciations like "a . i" for AI, "qna" for Q&A, and expands abbreviations.
 */
export function normalizeTextForSpeech(text) {
  if (!text) return "";
  let clean = text;

  // 1. Remove markdown code blocks and inline code
  clean = clean.replace(/```[\s\S]*?```/g, "");
  clean = clean.replace(/`([^`]+)`/g, "$1");

  // 2. Remove markdown formatting (headers, bold, italics, links)
  clean = clean.replace(/#{1,6}\s+/g, "");
  clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
  clean = clean.replace(/\*(.*?)\*/g, "$1");
  clean = clean.replace(/__(.*?)__/g, "$1");
  clean = clean.replace(/_(.*?)_/g, "$1");
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 3. Fix "AI" pronunciation:
  // Browser TTS often pronounces "A.I." as "A dot I" or pauses unnaturally.
  // Replacing with "A I " (with space, no periods) forces the engine to pronounce the letters clearly.
  clean = clean.replace(/\bA\.I\.\b/gi, "A I");
  clean = clean.replace(/\bAI\b/g, "A I");
  clean = clean.replace(/\bAI-/gi, "A I ");
  clean = clean.replace(/\ba\.i\b/gi, "A I");

  // 4. Fix "Q and A" / "Q&A" pronunciation (prevent saying "qna" or stuttering):
  clean = clean.replace(/\bQ\s*&\s*A\b/gi, "Questions and Answers");
  clean = clean.replace(/\bQ\s+and\s+A\b/gi, "Questions and Answers");
  clean = clean.replace(/\bQNA\b/gi, "Questions and Answers");
  clean = clean.replace(/\bQ\s+and\s+a\b/g, "Questions and Answers");

  // 5. Fix Question & Answer bullet labels:
  clean = clean.replace(/\bQ(\d+):?/gi, "Question $1: ");
  clean = clean.replace(/\bA(\d+):?/gi, "Answer $1: ");

  // 6. Fix Scores (format: "SCORE: 8/10" -> "Final score: 8 out of 10.")
  clean = clean.replace(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/gi, "Final Score: $1 out of 10.");

  // 7. Fix standard academic & common abbreviations:
  clean = clean.replace(/\bBBA\b/g, "B B A");
  clean = clean.replace(/\bB\.?Com\b/gi, "B Com");
  clean = clean.replace(/\b10th\b/gi, "tenth");
  clean = clean.replace(/\b12th\b/gi, "twelfth");
  clean = clean.replace(/\bECA\b/g, "extracurricular activities");
  clean = clean.replace(/\be\.g\.,?\b/gi, "for example");
  clean = clean.replace(/\bi\.e\.,?\b/gi, "that is");
  clean = clean.replace(/\betc\.\b/gi, "etcetera");
  clean = clean.replace(/\bvs\.?\b/gi, "versus");
  clean = clean.replace(/\bw\/o\b/gi, "without");

  // 8. Strip bullets, excessive hyphens, dashes, and special characters that TTS stumbles on
  clean = clean.replace(/^[\s\-\*•]+\s*/gm, "");
  clean = clean.replace(/[—–]/g, ", ");
  clean = clean.replace(/[\#\~\|\_]/g, "");

  // 9. Normalize spacing
  clean = clean.replace(/\s+/g, " ");

  return clean.trim();
}

/**
 * Custom hook wrapping Web Speech API speechSynthesis with natural voice selection,
 * intelligent pronunciation normalization, and chunked playback.
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const utteranceRef = useRef(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  /**
   * Automatically select the most natural, professional executive voice available on the device.
   * Prioritizes Microsoft Natural/Online, Google Natural US/UK, then system high-quality English.
   */
  const getBestVoice = useCallback(() => {
    if (!isSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Natural Neural / Online voices (Edge & Chrome on Windows/macOS)
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Online") ||
          v.name.includes("Neural"))
    );
    if (naturalVoice) return naturalVoice;

    // 2. Google High-Quality English voices (Chrome)
    const googleVoice = voices.find(
      (v) =>
        v.name.includes("Google") &&
        (v.lang === "en-US" || v.lang === "en-GB" || v.lang === "en-IN")
    );
    if (googleVoice) return googleVoice;

    // 3. Clear Microsoft Voices (Windows 10/11)
    const msVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Jenny") ||
          v.name.includes("Aria") ||
          v.name.includes("Guy") ||
          v.name.includes("Zira") ||
          v.name.includes("Mark"))
    );
    if (msVoice) return msVoice;

    // 4. Apple Voices (macOS / iOS / Safari)
    const appleVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Karen") ||
          v.name.includes("Siri"))
    );
    if (appleVoice) return appleVoice;

    // 5. Any English voice
    const anyEnglish = voices.find((v) => v.lang.startsWith("en-"));
    return anyEnglish || voices[0] || null;
  }, [isSupported]);

  /**
   * Split long text into natural sentence chunks to prevent browser speech cutoff bugs.
   */
  const chunkText = (text, maxLen = 160) => {
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) {
      chunks.push(current.trim());
    }
    return chunks;
  };

  const speak = useCallback(
    (text) => {
      return new Promise((resolve) => {
        if (!isSupported || !text) {
          resolve();
          return;
        }

        // Cancel any active speech
        window.speechSynthesis.cancel();

        // Apply pronunciation normalization
        const cleanText = normalizeTextForSpeech(text);
        const chunks = chunkText(cleanText);
        let chunkIndex = 0;
        setIsSpeaking(true);

        const voice = getBestVoice();
        if (voice) {
          setSelectedVoiceName(voice.name);
        }

        const speakNext = () => {
          if (chunkIndex >= chunks.length) {
            setIsSpeaking(false);
            resolve();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
          // Slightly deliberate, confident pace for executive clarity
          utterance.rate = 0.98;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (voice) {
            utterance.voice = voice;
          }

          utterance.onend = () => {
            chunkIndex++;
            speakNext();
          };

          utterance.onerror = (e) => {
            console.warn("TTS utterance warning:", e);
            chunkIndex++;
            speakNext();
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };

        speakNext();
      });
    },
    [isSupported, getBestVoice]
  );

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  // Load and pre-cache voices
  useEffect(() => {
    if (isSupported) {
      const updateVoice = () => {
        const v = getBestVoice();
        if (v) setSelectedVoiceName(v.name);
      };
      updateVoice();
      window.speechSynthesis.onvoiceschanged = updateVoice;
    }
  }, [isSupported, getBestVoice]);

  return { speak, cancel, isSpeaking, isSupported, selectedVoiceName };
}
