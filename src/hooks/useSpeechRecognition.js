"use client";
import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Custom hook wrapping the Web Speech API SpeechRecognition.
 * Auto-restarts on timeout, accumulates final transcript.
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const transcriptRef = useRef("");
  // Ref to track interim text for combining with final transcript
  const interimRef = useRef("");

  const isSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        transcriptRef.current += final;
        setTranscript(transcriptRef.current);
      }
      interimRef.current = interim;
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Could not restart recognition:", e);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [isSupported]);

  const start = useCallback(() => {
    if (!isSupported) return;

    // Stop existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
    }
  }, [isSupported, initRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterimText("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    start,
    stop,
    transcript,
    interimText,
    isListening,
    resetTranscript,
    isSupported,
    getTranscript: () => transcriptRef.current,
    // Returns final transcript + any pending interim text (prevents lost speech)
    getFullTranscript: () => {
      const full = (transcriptRef.current + " " + interimRef.current).trim();
      return full;
    },
  };
}
