"use client";
import { useState } from "react";
import { TOPICS, getRandomTopic } from "@/lib/topics";
import { TIMER_BOUNDS, TIMER_DEFAULTS } from "@/lib/constants";

export default function ConfigPanel({ onStart, onBack }) {
  const [prepTime, setPrepTime] = useState(TIMER_DEFAULTS.prepTime);
  const [presentTime, setPresentTime] = useState(TIMER_DEFAULTS.presentTime);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [randomMode, setRandomMode] = useState(false);

  const handleTopicSelect = (id) => {
    setRandomMode(false);
    setSelectedTopicId(id);
  };

  const handleRandomToggle = () => {
    setRandomMode(!randomMode);
    if (!randomMode) setSelectedTopicId(null);
  };

  const handleStart = () => {
    let topic;
    if (randomMode) {
      topic = getRandomTopic();
    } else {
      topic = TOPICS.find((t) => t.id === selectedTopicId);
    }

    if (!topic) {
      alert("Please select a topic or enable random selection.");
      return;
    }

    onStart({ prepTime, presentTime, topic });
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto w-full">
        <button
          onClick={onBack ? onBack : () => window.location.href = '/'}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {onBack ? 'Back to modules' : 'Back to Home'}
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Configure Your <span className="gradient-text">Session</span>
          </h1>
          <p className="text-slate-400">Set your timers, pick a topic, and begin your practice round.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1">
        {/* Timer Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Preparation Time */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-xl">📝</span> Preparation Time
                </h3>
                <p className="text-xs text-slate-500 mt-1">Time to prepare your presentation</p>
              </div>
              <div className="text-3xl font-bold text-white font-mono">
                {prepTime}s
              </div>
            </div>
            <input
              type="range"
              id="prep-time-slider"
              min={TIMER_BOUNDS.min}
              max={TIMER_BOUNDS.max}
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>{TIMER_BOUNDS.min}s</span>
              <span>{TIMER_BOUNDS.max}s</span>
            </div>
          </div>

          {/* Presentation Time */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-xl">🎤</span> Presentation Time
                </h3>
                <p className="text-xs text-slate-500 mt-1">Time to deliver your presentation</p>
              </div>
              <div className="text-3xl font-bold text-slate-300 font-mono">
                {presentTime}s
              </div>
            </div>
            <input
              type="range"
              id="present-time-slider"
              min={TIMER_BOUNDS.min}
              max={TIMER_BOUNDS.max}
              value={presentTime}
              onChange={(e) => setPresentTime(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>{TIMER_BOUNDS.min}s</span>
              <span>{TIMER_BOUNDS.max}s</span>
            </div>
          </div>
        </div>

        {/* Topic Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📋</span> Select Your Topic
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                id={`topic-${topic.id}`}
                onClick={() => handleTopicSelect(topic.id)}
                className={`topic-card glass rounded-xl p-4 text-left cursor-pointer ${
                  selectedTopicId === topic.id ? "selected" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{topic.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1 flex items-center gap-2">
                      {topic.title}
                      {selectedTopicId === topic.id && (
                        <span className="text-white">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2">
                      {topic.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Random Topic Option */}
          <button
            id="random-topic-btn"
            onClick={handleRandomToggle}
            className={`w-full glass rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
              randomMode
                ? "border-emerald-500/50 bg-emerald-500/10 shadow-emerald-500/10 shadow-lg"
                : "hover:bg-white/[0.06]"
            }`}
          >
            <span className="text-xl">🎲</span>
            <span className="font-medium text-sm">
              Let AI Choose Topic Randomly
            </span>
            {randomMode && <span className="text-emerald-400 font-bold">✓</span>}
          </button>
        </div>

        {/* Start Button */}
        <div className="flex justify-center pb-8">
          <button
            id="start-round-btn"
            onClick={handleStart}
            disabled={!selectedTopicId && !randomMode}
            className="px-10 py-4 bg-gradient-to-r from-white to-slate-200 hover:from-slate-100 hover:to-slate-300 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-semibold text-lg rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/10 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            🚀 Start Micro-Presentation Round
          </button>
        </div>
      </div>
    </div>
  );
}
