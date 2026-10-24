"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

const CameraFeed = forwardRef(function CameraFeed(
  { isActive, stream, isWarning, isRecording, currentExpression },
  ref
) {
  const videoRef = useRef(null);
  const internalStreamRef = useRef(null);

  // Expose the video element for external frame capture or inspection
  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
  }));

  // Bind passed stream or initialize internally
  useEffect(() => {
    if (stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      return;
    }

    if (isActive && !stream) {
      let isMounted = true;
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: true,
        })
        .then((s) => {
          if (isMounted) {
            internalStreamRef.current = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
            }
          } else {
            s.getTracks().forEach((t) => t.stop());
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
        });

      return () => {
        isMounted = false;
        if (internalStreamRef.current) {
          internalStreamRef.current.getTracks().forEach((track) => track.stop());
          internalStreamRef.current = null;
        }
      };
    }
  }, [isActive, stream]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isWarning
          ? "ring-2 ring-red-500 shadow-red-500/20"
          : isActive
          ? "ring-1 ring-white/10"
          : ""
      }`}
      id="camera-feed"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full aspect-video bg-slate-950 camera-mirror object-cover"
      />

      {/* Multimodal AI active badge */}
      {isActive && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/10 text-xs font-medium text-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>AI Multimodal Vision</span>
        </div>
      )}

      {/* Recording / Live indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] text-red-400 font-semibold tracking-wide uppercase">
            {isRecording ? "REC" : "LIVE"}
          </span>
        </div>
      )}

      {/* MediaPipe Real-Time Facial/Posture Feedback */}
      {isActive && currentExpression && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 border border-white/15 backdrop-blur-md text-xs shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-slate-400 font-medium">Expression:</span>
          <span className="font-semibold text-white">{currentExpression}</span>
        </div>
      )}

      {/* Inactive state */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm font-medium text-slate-400">
              Camera will activate when session starts
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default CameraFeed;
