"use client";
import { useState, useRef, useCallback, useEffect } from "react";

function getSupportedAudioMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

/**
 * Custom hook to record audio with MediaRecorder and capture video frames from the webcam.
 */
export function useMediaRecorder() {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const capturedFramesRef = useRef([]);
  const frameIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize canvas for capturing frames
  useEffect(() => {
    if (typeof document !== "undefined") {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  // Start webcam + mic stream
  const startStream = useCallback(async () => {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }

    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = userStream;
      setStream(userStream);
      setHasPermission(true);
      return userStream;
    } catch (err) {
      console.error("Camera/Mic permission error:", err);
      setHasPermission(false);
      throw err;
    }
  }, []);

  // Stop stream tracks
  const stopStream = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  // ─── AUDIO RECORDING ────────────────────────────────
  const startRecording = useCallback(async () => {
    let currentStream = streamRef.current;
    if (!currentStream || !currentStream.active) {
      currentStream = await startStream();
    }

    audioChunksRef.current = [];

    // Extract audio track for the audio recorder
    const audioTracks = currentStream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      console.warn("No audio tracks available in current stream");
      return;
    }

    const audioOnlyStream = new MediaStream(audioTracks);
    const mimeType = getSupportedAudioMimeType();

    try {
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(audioOnlyStream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      setIsRecording(false);
    }
  }, [startStream]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        const mimeType = getSupportedAudioMimeType() || "audio/webm";
        resolve(new Blob(audioChunksRef.current, { type: mimeType }));
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || getSupportedAudioMimeType() || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        setIsRecording(false);
        resolve(audioBlob);
      };

      try {
        recorder.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
        setIsRecording(false);
        resolve(new Blob([], { type: "audio/webm" }));
      }
    });
  }, []);

  // ─── FRAME CAPTURE ──────────────────────────────────
  const captureFrame = useCallback((videoElement) => {
    if (!videoElement || !canvasRef.current) return null;
    if (videoElement.readyState < 2 || videoElement.videoWidth === 0) return null;

    const canvas = canvasRef.current;
    // Set reduced resolution (480x360) for fast, low-bandwidth uploads
    canvas.width = 480;
    canvas.height = 360;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    try {
      return canvas.toDataURL("image/jpeg", 0.65);
    } catch (e) {
      console.error("Canvas toDataURL error:", e);
      return null;
    }
  }, []);

  const startPeriodicFrameCapture = useCallback((videoElement, intervalMs = 2500) => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    frameIntervalRef.current = setInterval(() => {
      if (!videoElement) return;
      const frame = captureFrame(videoElement);
      if (frame) {
        // Cap max stored frames at 25 to prevent memory buildup
        if (capturedFramesRef.current.length >= 25) {
          // Remove earlier frames while keeping evenly distributed
          capturedFramesRef.current.shift();
        }
        capturedFramesRef.current.push(frame);
      }
    }, intervalMs);
  }, [captureFrame]);

  const stopPeriodicFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  const getCapturedFrames = useCallback(() => {
    return [...capturedFramesRef.current];
  }, []);

  const clearCapturedFrames = useCallback(() => {
    capturedFramesRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    stream,
    hasPermission,
    isRecording,
    isTranscribing,
    setIsTranscribing,
    startStream,
    stopStream,
    startRecording,
    stopRecording,
    captureFrame,
    startPeriodicFrameCapture,
    stopPeriodicFrameCapture,
    getCapturedFrames,
    clearCapturedFrames,
  };
}
