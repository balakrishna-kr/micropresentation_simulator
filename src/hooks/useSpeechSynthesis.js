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

  // 2. Remove markdown formatting (headers, bold, italics, links, blockquotes)
  clean = clean.replace(/#{1,6}\s+/g, "");
  clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
  clean = clean.replace(/\*(.*?)\*/g, "$1");
  clean = clean.replace(/__(.*?)__/g, "$1");
  clean = clean.replace(/_(.*?)_/g, "$1");
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  clean = clean.replace(/^>\s*/gm, "");

  // 3. Foolproof phonetic replacement for "AI" -> "Ay-Eye":
  // Browser TTS voices often pronounce "AI" as the word "I" (/aɪ/) or pause unnaturally at "A.I.".
  // "Ay-Eye" forces all TTS engines (Google, Microsoft, Apple) to pronounce the distinct letters "A" and "I".
  clean = clean.replace(/(?<=\b|[_\-])(?:A\.I\.|AI|a\.i\.|ai)(?=\b|[_\-])/g, "Ay-Eye");
  clean = clean.replace(/\bAy-Eye-powered\b/gi, "Ay-Eye powered");
  clean = clean.replace(/\bAy-Eye\s+model\b/gi, "Ay-Eye model");

  // 4. Latin & Common Shorthands (handles dots, brackets, commas, trailing spaces):
  // e.g. / e.g / eg. / (e.g., ...) -> "for example, "
  clean = clean.replace(/(^|[\s(])e\.?g\.?(?:[,:.]|\b)\s*/gi, "$1for example, ");
  // i.e. / i.e / ie. / (i.e., ...) -> "that is, "
  clean = clean.replace(/(^|[\s(])i\.?e\.?(?:[,:.]|\b)\s*/gi, "$1that is, ");
  // etc. / etc -> "et cetera "
  clean = clean.replace(/(^|[\s(])etc\.?(?:[,:.]|\b)\s*/gi, "$1et cetera ");
  // vs / vs. / v. -> "versus "
  clean = clean.replace(/(^|[\s(])vs?\.?\s+/gi, "$1versus ");
  // w/o -> without, w/ -> with
  clean = clean.replace(/\bw\/o\b/gi, "without");
  clean = clean.replace(/\bw\/(?=\s)/gi, "with ");
  // approx -> approximately
  clean = clean.replace(/\bapprox\.?\s*/gi, "approximately ");

  // 5. Expand Q&A and question labels:
  clean = clean.replace(/\bQ\s*&\s*A\b/gi, "Questions and Answers");
  clean = clean.replace(/\bQ\s+and\s+A\b/gi, "Questions and Answers");
  clean = clean.replace(/\bQNA\b/gi, "Questions and Answers");
  clean = clean.replace(/\bQ(\d+):?\s*/gi, "Question $1: ");
  clean = clean.replace(/\bA(\d+):?\s*/gi, "Answer $1: ");

  // 6. Fix Scores (format: "SCORE: 8/10" or "8/10" -> "8 out of 10")
  clean = clean.replace(/(?:SCORE|Score|score):\s*(\d+(?:\.\d+)?)\s*\/\s*10/gi, "Final Score: $1 out of 10.");
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*\/\s*10\b/g, "$1 out of 10");

  // 7. Academic and technical abbreviations:
  clean = clean.replace(/\bBBA\b/g, "B B A");
  clean = clean.replace(/\bB\.?Com\b/gi, "B Com");
  clean = clean.replace(/\bMBA\b/g, "M B A");
  clean = clean.replace(/\bECA\b/g, "extracurricular activities");
  clean = clean.replace(/\bWPM\b/g, "words per minute");
  clean = clean.replace(/\b10th\b/gi, "tenth");
  clean = clean.replace(/\b12th\b/gi, "twelfth");
  clean = clean.replace(/\b1st\b/gi, "first");
  clean = clean.replace(/\b2nd\b/gi, "second");
  clean = clean.replace(/\b3rd\b/gi, "third");

  // 8. Symbols: &, %, +, #
  clean = clean.replace(/\s*&\s*/g, " and ");
  clean = clean.replace(/(\d+)\s*%/g, "$1 percent");
  clean = clean.replace(/\s*\+\s*/g, " plus ");
  clean = clean.replace(/No\.\s*(\d+)/gi, "Number $1");

  // 9. Strip bullets, excessive hyphens, dashes, and stray characters
  clean = clean.replace(/^[\s\-\*•·]+\s*/gm, "");
  clean = clean.replace(/[—–]/g, ", ");
  clean = clean.replace(/[\#\~\|\_]/g, "");
  clean = clean.replace(/\.{2,}/g, ", ");

  // 10. Normalize spacing
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

        // Cancel any active speech and ensure synth is not paused
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

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
            if (typeof window !== "undefined") {
              window._activeUtterance = null;
            }
            resolve();
            return;
          }

          const chunk = chunks[chunkIndex];
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.rate = 0.98;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (voice) {
            utterance.voice = voice;
          }

          // Safety watchdog timeout (estimated word duration + 3s buffer)
          const wordCount = chunk.split(/\s+/).filter(Boolean).length;
          const maxWaitMs = Math.max(wordCount * 800, 3500);
          let hasFinished = false;

          const watchdogTimer = setTimeout(() => {
            if (!hasFinished) {
              hasFinished = true;
              console.warn("TTS watchdog timer triggered for chunk:", chunkIndex);
              chunkIndex++;
              speakNext();
            }
          }, maxWaitMs);

          const handleFinish = () => {
            if (!hasFinished) {
              hasFinished = true;
              clearTimeout(watchdogTimer);
              chunkIndex++;
              speakNext();
            }
          };

          utterance.onend = handleFinish;
          utterance.onerror = (e) => {
            console.warn("TTS utterance warning:", e);
            handleFinish();
          };

          // Protect from Chrome garbage collection
          utteranceRef.current = utterance;
          if (typeof window !== "undefined") {
            window._activeUtterance = utterance;
          }

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
