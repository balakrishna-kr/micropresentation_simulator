"use client";

export default function Timer({ timeRemaining, totalTime, phase }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const dashOffset = circumference * (1 - progress);

  // Color based on remaining time percentage
  let strokeColor = "#34d399"; // emerald
  let textColor = "text-emerald-400";
  if (progress < 0.25) {
    strokeColor = "#f87171"; // red
    textColor = "text-red-400";
  } else if (progress < 0.5) {
    strokeColor = "#fbbf24"; // amber
    textColor = "text-amber-400";
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center" id="timer-display">
      <div className="relative w-48 h-48">
        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="timer-circle"
            style={{ filter: `drop-shadow(0 0 8px ${strokeColor}40)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold font-mono ${textColor}`}>
            {display}
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">
            {phase}
          </span>
        </div>
      </div>

      {/* Danger pulse when < 10 seconds */}
      {timeRemaining > 0 && timeRemaining <= 10 && (
        <div className="mt-3 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-pulse">
          ⚠️ Time running out!
        </div>
      )}
    </div>
  );
}
