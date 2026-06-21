"use client";
import { useState } from "react";
import {
  BOARD_OPTIONS_10TH,
  BOARD_OPTIONS_12TH,
  ECA_RESULT_OPTIONS,
} from "@/lib/interviewConstants";

export default function InterviewConfigPanel({ onStart, onBack }) {
  const [board10th, setBoard10th] = useState("");
  const [marks10th, setMarks10th] = useState("");
  const [board12th, setBoard12th] = useState("");
  const [marks12th, setMarks12th] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [ecaRows, setEcaRows] = useState([
    { eventName: "", result: "" },
  ]);
  const [errors, setErrors] = useState({});

  const addEcaRow = () => {
    setEcaRows([...ecaRows, { eventName: "", result: "" }]);
  };

  const removeEcaRow = (index) => {
    if (ecaRows.length <= 1) return;
    setEcaRows(ecaRows.filter((_, i) => i !== index));
  };

  const updateEcaRow = (index, field, value) => {
    const updated = [...ecaRows];
    updated[index][field] = value;
    setEcaRows(updated);
  };

  const [marksCardBase64, setMarksCardBase64] = useState(null);

  // Resize and compress image to a max dimension, returning a data URL
  const resizeImage = (file, maxDim = 1024) => {
    return new Promise((resolve) => {
      // Only process images, skip PDFs
      if (!file.type.startsWith("image/")) {
        resolve(null);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        // Scale down if larger than maxDim
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Resize and compress the image for the vision AI
      const compressed = await resizeImage(file);
      setMarksCardBase64(compressed);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!board10th) newErrors.board10th = "Select your 10th board";
    if (!marks10th || isNaN(marks10th) || marks10th < 0 || marks10th > 100)
      newErrors.marks10th = "Enter valid marks (0-100)";
    if (!board12th) newErrors.board12th = "Select your 12th board";
    if (!marks12th || isNaN(marks12th) || marks12th < 0 || marks12th > 100)
      newErrors.marks12th = "Enter valid marks (0-100)";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (!validate()) return;

    const board10Label = BOARD_OPTIONS_10TH.find(
      (b) => b.value === board10th
    )?.label || board10th;
    const board12Label = BOARD_OPTIONS_12TH.find(
      (b) => b.value === board12th
    )?.label || board12th;

    const validEcaRows = ecaRows.filter(
      (row) => row.eventName.trim() && row.result
    );

    onStart({
      academicData: {
        board10th,
        board10thLabel: board10Label,
        marks10th,
        board12th,
        board12thLabel: board12Label,
        marks12th,
        uploadedFileName: uploadedFile?.name || null,
        marksCardBase64: marksCardBase64 || null,
      },
      ecaList: validEcaRows,
    });
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors";
  const selectClass =
    "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors appearance-none cursor-pointer";
  const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";
  const errorClass = "text-[10px] text-red-400 mt-1";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <button
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-300 mb-4 flex items-center gap-1 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 17l-5-5m0 0l5-5m-5 5h12"
              />
            </svg>
            Back to modules
          </button>
          <h1 className="text-2xl font-bold mb-2">
            <span className="gradient-text">Personal Interview Setup</span>
          </h1>
          <p className="text-sm text-slate-400">
            Fill in your academic details and extracurricular activities. This
            information will be used by the AI interviewer.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* ─── 10th Standard ──────────────────── */}
          <div className="glass rounded-2xl p-6 animate-fade-in-up">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="text-base">📘</span>
              10th Standard Academics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="board-10th" className={labelClass}>
                  Board
                </label>
                <select
                  id="board-10th"
                  value={board10th}
                  onChange={(e) => setBoard10th(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select Board</option>
                  {BOARD_OPTIONS_10TH.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.board10th && (
                  <p className={errorClass}>{errors.board10th}</p>
                )}
              </div>
              <div>
                <label htmlFor="marks-10th" className={labelClass}>
                  Marks / Percentage
                </label>
                <input
                  id="marks-10th"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 85"
                  value={marks10th}
                  onChange={(e) => setMarks10th(e.target.value)}
                  className={inputClass}
                />
                {errors.marks10th && (
                  <p className={errorClass}>{errors.marks10th}</p>
                )}
              </div>
            </div>
          </div>

          {/* ─── 12th Standard ──────────────────── */}
          <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="text-base">📗</span>
              12th Standard Academics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="board-12th" className={labelClass}>
                  Board
                </label>
                <select
                  id="board-12th"
                  value={board12th}
                  onChange={(e) => setBoard12th(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select Board</option>
                  {BOARD_OPTIONS_12TH.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.board12th && (
                  <p className={errorClass}>{errors.board12th}</p>
                )}
              </div>
              <div>
                <label htmlFor="marks-12th" className={labelClass}>
                  Marks / Percentage
                </label>
                <input
                  id="marks-12th"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 78"
                  value={marks12th}
                  onChange={(e) => setMarks12th(e.target.value)}
                  className={inputClass}
                />
                {errors.marks12th && (
                  <p className={errorClass}>{errors.marks12th}</p>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="marks-card-upload" className={labelClass}>
                Upload 12th Marks Card (optional)
              </label>
              <div className="file-upload rounded-lg p-4 text-center cursor-pointer relative">
                <input
                  id="marks-card-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-emerald-400 text-sm">✓</span>
                    <span className="text-sm text-slate-300 truncate max-w-[200px]">
                      {uploadedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl mb-1 opacity-50">📄</div>
                    <p className="text-xs text-slate-500">
                      Drop file here or click to upload (Images / PDF)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Extracurricular Activities ──────── */}
          <div className="glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="text-base">🏆</span>
                Extracurricular Activities
              </h2>
              <button
                id="add-eca-btn"
                type="button"
                onClick={addEcaRow}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
              >
                + Add Activity
              </button>
            </div>

            <div className="space-y-3">
              {ecaRows.map((row, index) => (
                <div
                  key={index}
                  className="eca-row flex items-start gap-3 animate-fade-in"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Event Name (e.g. Science Exhibition)"
                      value={row.eventName}
                      onChange={(e) =>
                        updateEcaRow(index, "eventName", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="w-36">
                    <select
                      value={row.result}
                      onChange={(e) =>
                        updateEcaRow(index, "result", e.target.value)
                      }
                      className={selectClass}
                    >
                      <option value="">Result</option>
                      {ECA_RESULT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {ecaRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEcaRow(index)}
                      className="mt-2 text-red-400/60 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Start Button ──────────────────── */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <button
              id="start-interview-btn"
              onClick={handleStart}
              className="w-full py-4 bg-gradient-to-r from-white to-slate-200 hover:from-slate-100 hover:to-slate-300 text-slate-950 font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/10 text-sm"
            >
              🎓 Start Personal Interview Round
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-2">
              Camera and microphone access will be requested
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
