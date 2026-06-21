"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

const CameraFeed = forwardRef(function CameraFeed(
  { isActive, expression, isWarning },
  ref
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Expose the video element for vision tracking
  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
  }));

  useEffect(() => {
    if (isActive) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${
        isWarning ? "camera-border-warning" : isActive ? "camera-border-active" : ""
      }`}
      id="camera-feed"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full aspect-video bg-slate-900 camera-mirror object-cover"
      />

      {/* Expression overlay badge */}
      {expression && isActive && (
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full glass text-xs font-medium animate-fade-in">
          {expression}
        </div>
      )}

      {/* Recording indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-red-400 font-medium uppercase">
            Live
          </span>
        </div>
      )}

      {/* Inactive state */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-slate-500">Camera will activate when round starts</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default CameraFeed;
