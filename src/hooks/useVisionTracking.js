"use client";
import { useRef, useState, useCallback } from "react";

/**
 * Vision tracking hook using MediaPipe Tasks Vision.
 * Uses FaceLandmarker for expressions + gaze, and pixel-diff for movement.
 * Logs analytics entries every ~2 seconds.
 */
export function useVisionTracking() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentExpression, setCurrentExpression] = useState("Neutral");

  const faceLandmarkerRef = useRef(null);
  const analyticsLogRef = useRef([]);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevFrameRef = useRef(null);

  /**
   * Classify expression from face blendshapes.
   * Thresholds are intentionally low to detect subtle expressions
   * from a typical webcam feed — blendshape scores rarely exceed 0.4
   * for most people in normal conditions.
   */
  const classifyExpression = (blendshapes) => {
    if (!blendshapes || blendshapes.length === 0) return "No Face Detected";

    const shapes = {};
    blendshapes[0].categories.forEach((cat) => {
      shapes[cat.categoryName] = cat.score;
    });

    const smileLeft = shapes["mouthSmileLeft"] || 0;
    const smileRight = shapes["mouthSmileRight"] || 0;
    const browDownLeft = shapes["browDownLeft"] || 0;
    const browDownRight = shapes["browDownRight"] || 0;
    const jawOpen = shapes["jawOpen"] || 0;
    const browInnerUp = shapes["browInnerUp"] || 0;
    const eyeWideLeft = shapes["eyeWideLeft"] || 0;
    const eyeWideRight = shapes["eyeWideRight"] || 0;
    const mouthFrownLeft = shapes["mouthFrownLeft"] || 0;
    const mouthFrownRight = shapes["mouthFrownRight"] || 0;
    const cheekSquintLeft = shapes["cheekSquintLeft"] || 0;
    const cheekSquintRight = shapes["cheekSquintRight"] || 0;
    const mouthPressLeft = shapes["mouthPressLeft"] || 0;
    const mouthPressRight = shapes["mouthPressRight"] || 0;

    const avgSmile = (smileLeft + smileRight) / 2;
    const avgBrowDown = (browDownLeft + browDownRight) / 2;
    const avgEyeWide = (eyeWideLeft + eyeWideRight) / 2;
    const avgFrown = (mouthFrownLeft + mouthFrownRight) / 2;
    const avgCheekSquint = (cheekSquintLeft + cheekSquintRight) / 2;
    const avgMouthPress = (mouthPressLeft + mouthPressRight) / 2;

    // Order matters: check most expressive states first
    // Thresholds tuned low — webcam blendshape scores are typically subtle (0.05–0.3)
    if (avgSmile > 0.2) return "😊 Confident";
    if (avgSmile > 0.1 && avgCheekSquint > 0.06) return "😄 Engaged";
    if (avgSmile > 0.08 && jawOpen > 0.08) return "😄 Engaged";
    if (avgEyeWide > 0.2 && browInnerUp > 0.12) return "😲 Surprised";
    if (avgBrowDown > 0.15 && avgFrown > 0.1) return "😟 Nervous";
    if (avgFrown > 0.15 || avgMouthPress > 0.22) return "😐 Tense";
    if (avgBrowDown > 0.1) return "🤔 Focused";
    if (jawOpen > 0.1) return "🗣️ Speaking";
    if (browInnerUp > 0.08) return "🤔 Thinking";
    if (avgSmile > 0.03 && avgCheekSquint > 0.03) return "😌 At Ease";
    if (avgSmile > 0.03) return "🙂 Calm";
    if (avgEyeWide > 0.08 || browInnerUp > 0.05) return "👀 Attentive";
    return "😶 Neutral";
  };

  /**
   * Detect if person is looking away using face landmarks (nose position)
   */
  const detectLookingAway = (faceLandmarks) => {
    if (!faceLandmarks || faceLandmarks.length === 0) return true;

    const landmarks = faceLandmarks[0];
    const noseTip = landmarks[1];
    if (!noseTip) return false;

    const xDeviation = Math.abs(noseTip.x - 0.5);
    const yDeviation = Math.abs(noseTip.y - 0.5);

    return xDeviation > 0.25 || yDeviation > 0.3;
  };

  /**
   * Detect body/hand movement via pixel difference between frames.
   * Samples multiple regions across the frame for better coverage.
   */
  const detectMovementByPixelDiff = (canvas) => {
    const ctx = canvas.getContext("2d");

    try {
      // Sample the full frame at reduced resolution for overall motion
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Compute a brightness-weighted hash from evenly spaced pixels
      let sum = 0;
      let count = 0;
      // Sample every 40th pixel for performance (covers ~12000 pixels)
      for (let i = 0; i < pixels.length; i += 160) {
        sum += pixels[i] + pixels[i + 1] + pixels[i + 2];
        count++;
      }

      const avg = sum / count;
      const prev = prevFrameRef.current;
      prevFrameRef.current = avg;

      if (prev === null) return false;

      // Compare average brightness — even small movements cause noticeable shifts
      const diff = Math.abs(avg - prev) / Math.max(avg, 1);
      return diff > 0.005; // 0.5% change = movement detected (more sensitive to catch subtle gestures)
    } catch (e) {
      return false;
    }
  };

  /**
   * Suppress WASM console noise during model initialization.
   * MediaPipe's compiled C++ code prints INFO/WARN messages we can't control.
   */
  const suppressConsoleNoise = () => {
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;
    const origError = console.error;

    const suppressPatterns = [
      "XNNPACK",
      "TensorFlow Lite",
      "OpenGL error checking",
      "NORM_RECT",
      "IMAGE_DIMENSIONS",
      "PROJECTION_MATRIX",
      "Feedback manager",
      "inference_feedback_manager",
      "landmark_projection_calculator",
      "gl_context",
      "INFO:",
      "Created TensorFlow",
    ];

    const shouldSuppress = (...args) => {
      const msg = args.join(" ");
      return suppressPatterns.some((p) => msg.includes(p));
    };

    console.log = (...args) => {
      if (!shouldSuppress(...args)) origLog.apply(console, args);
    };
    console.info = (...args) => {
      if (!shouldSuppress(...args)) origInfo.apply(console, args);
    };
    console.warn = (...args) => {
      if (!shouldSuppress(...args)) origWarn.apply(console, args);
    };
    // WASM stderr output goes through console.error in Next.js dev mode
    console.error = (...args) => {
      if (!shouldSuppress(...args)) origError.apply(console, args);
    };

    // Return a restore function
    return () => {
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
    };
  };

  /**
   * Initialize MediaPipe FaceLandmarker
   */
  const initTracking = useCallback(async (videoElement) => {
    if (!videoElement) return;
    videoRef.current = videoElement;
    setIsLoading(true);

    // Suppress noisy WASM logs during model loading
    const restoreConsole = suppressConsoleNoise();

    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // Offscreen canvas for frame capture (provides explicit dimensions)
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;

      const faceLandmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        }
      );

      faceLandmarkerRef.current = faceLandmarker;
      setIsReady(true);
      setIsLoading(false);

      // Start periodic tracking
      startTracking(videoElement);
    } catch (error) {
      console.error("Failed to initialize vision tracking:", error);
      setIsLoading(false);
      setIsReady(true);
    } finally {
      // Keep console suppressed — WASM may log during detection too
      // We restore only on stopTracking
      videoRef.current._restoreConsole = restoreConsole;
    }
  }, []);

  const startTracking = (videoElement) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (
        !videoElement ||
        videoElement.paused ||
        videoElement.readyState < 2
      )
        return;

      try {
        let expression = "Neutral";
        let lookingAway = false;
        let handsMoving = false;

        // Draw video frame to canvas with explicit dimensions
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const timestamp = performance.now();

        if (faceLandmarkerRef.current) {
          const faceResult = faceLandmarkerRef.current.detectForVideo(
            canvas,
            timestamp
          );
          expression = classifyExpression(faceResult.faceBlendshapes);
          lookingAway = detectLookingAway(faceResult.faceLandmarks);
          setCurrentExpression(expression);
        }

        // Lightweight pixel-diff for movement
        handsMoving = detectMovementByPixelDiff(canvas);

        analyticsLogRef.current.push({
          timestamp: Date.now(),
          expression: expression.replace(/^[^\s]+\s/, ""), // Remove emoji
          handsMoving,
          lookingAway,
        });
      } catch (e) {
        // Silently continue on detection errors
      }
    }, 2000);
  };

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }

    // Restore console if it was suppressed
    if (videoRef.current && videoRef.current._restoreConsole) {
      videoRef.current._restoreConsole();
    }

    prevFrameRef.current = null;
    setIsReady(false);
  }, []);

  const getAnalyticsLog = useCallback(() => {
    return [...analyticsLogRef.current];
  }, []);

  const clearLog = useCallback(() => {
    analyticsLogRef.current = [];
    prevFrameRef.current = null;
  }, []);

  return {
    initTracking,
    stopTracking,
    getAnalyticsLog,
    clearLog,
    currentExpression,
    isLoading,
    isReady,
  };
}
