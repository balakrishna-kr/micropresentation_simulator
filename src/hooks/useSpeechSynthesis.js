"use client";
import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook wrapping the Web Speech API speechSynthesis.
 * Handles the Chrome long-utterance bug by chunking text.
 * Returns a promise from speak() that resolves when done.
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const resolveRef = useRef(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  /**
   * Strip markdown formatting so TTS doesn't read "asterisk asterisk" etc.
   */
  const stripMarkdown = (text) => {
    return text
      .replace(/\bAI\b/gi, 'A.I.')         // Ensure "AI" is pronounced as "A-I" rather than "i"
      .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold** → bold
      .replace(/\*(.+?)\*/g, '$1')         // *italic* → italic
      .replace(/__(.+?)__/g, '$1')         // __bold__ → bold
      .replace(/_(.+?)_/g, '$1')           // _italic_ → italic
      .replace(/^#{1,6}\s+/gm, '')         // ### Heading → Heading
      .replace(/^[\-\*]\s+/gm, '')         // - bullet → bullet
      .replace(/^\d+\.\s+/gm, '')          // 1. numbered → numbered
      .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // `code` → code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link
      .replace(/\n{3,}/g, '\n\n')           // Collapse excessive newlines
      .trim();
  };

  /**
   * Split long text into chunks at sentence boundaries to avoid
   * Chrome cutting off utterances > ~200 chars.
   */
  const chunkText = (text, maxLen = 180) => {
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

  const getVoice = useCallback(() => {
    if (!isSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    // Prefer Indian English, then any English
    const indianEn = voices.find(
      (v) => v.lang === "en-IN" && !v.localService === false
    );
    const anyEn = voices.find((v) => v.lang.startsWith("en-"));
    return indianEn || anyEn || voices[0] || null;
  }, [isSupported]);

  const speak = useCallback(
    (text) => {
      return new Promise((resolve) => {
        if (!isSupported || !text) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Strip markdown before speaking
        const cleanText = stripMarkdown(text);
        const chunks = chunkText(cleanText);
        let chunkIndex = 0;
        setIsSpeaking(true);

        const speakNext = () => {
          if (chunkIndex >= chunks.length) {
            setIsSpeaking(false);
            resolve();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          const voice = getVoice();
          if (voice) utterance.voice = voice;

          utterance.onend = () => {
            chunkIndex++;
            speakNext();
          };

          utterance.onerror = (e) => {
            console.warn("TTS error:", e);
            chunkIndex++;
            speakNext();
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };

        speakNext();
      });
    },
    [isSupported, getVoice]
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

  // Force voice loading (Chrome needs this)
  useEffect(() => {
    if (isSupported) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, [isSupported]);

  return { speak, cancel, isSpeaking, isSupported };
}
