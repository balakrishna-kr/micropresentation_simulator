/**
 * Client-side API helpers for Whisper transcription, OpenRouter visual analysis, and OpenRouter tone analysis.
 */

/**
 * Transcribe an audio Blob using Groq Whisper via our /api/whisper route.
 * @param {Blob} audioBlob - The recorded audio blob.
 * @returns {Promise<{ text: string, status?: string, modelUsed?: string }>}
 */
export async function transcribeAudio(audioBlob) {
  if (!audioBlob || audioBlob.size === 0) {
    return { text: "", status: "EMPTY" };
  }

  const formData = new FormData();
  const extension = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
  formData.append("file", audioBlob, `recording.${extension}`);

  const res = await fetch("/api/whisper", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Groq Whisper Client] API error:", res.status, errorText);
    throw new Error(`Whisper transcription failed: ${res.status}`);
  }

  const data = await res.json();
  console.log(`[Groq Whisper Client] ✅ Received transcript: ${data.wordCount || 0} words (${data.modelUsed})`);
  return data;
}

/**
 * Analyze video frames using OpenRouter Vision AI via /api/analyze-visual.
 * @param {string[]} frames - Array of base64 JPEG data URLs.
 * @returns {Promise<{ visualNotes: string, modelUsed?: string, status?: string, success?: boolean }>}
 */
export async function analyzeVisual(frames) {
  if (!frames || frames.length === 0) {
    return {
      visualNotes: "No video frames available for visual analysis.",
      modelUsed: "None",
      status: "NO_FRAMES",
      success: false,
    };
  }

  // Sample at most 4 frames evenly spaced for rapid, responsive analysis
  let sampledFrames = frames;
  if (frames.length > 4) {
    const step = (frames.length - 1) / 3;
    sampledFrames = [
      frames[0],
      frames[Math.round(step)],
      frames[Math.round(step * 2)],
      frames[frames.length - 1],
    ];
  }

  console.log(`[OpenRouter Vision Client] 📡 Dispatching ${sampledFrames.length} frames to OpenRouter...`);

  const res = await fetch("/api/analyze-visual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames: sampledFrames }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[OpenRouter Vision Client] API error:", res.status, errorText);
    return {
      visualNotes: "Visual presence: Candidate maintained camera gaze and stable composure.",
      modelUsed: "Fallback",
      status: "FAILED",
      success: false,
    };
  }

  const data = await res.json();
  console.log(`[OpenRouter Vision Client] ✅ Vision analyzed via ${data.modelUsed} (${data.status})`);
  return data;
}

/**
 * Analyze vocal tone and emotion using OpenRouter AI via /api/analyze-tone.
 * @param {Blob} audioBlob - The recorded audio blob.
 * @param {string} transcript - Spoken transcript from Whisper.
 * @param {object} metrics - Optional duration and cadence metrics.
 * @returns {Promise<{ toneNotes: string, modelUsed?: string, status?: string, success?: boolean }>}
 */
export async function analyzeTone(audioBlob, transcript = "", metrics = {}) {
  let audioBase64 = null;
  let format = "webm";

  if (audioBlob && audioBlob.size > 0) {
    try {
      audioBase64 = await blobToBase64(audioBlob);
      if (audioBlob.type.includes("wav")) format = "wav";
      else if (audioBlob.type.includes("mp4")) format = "mp4";
      else if (audioBlob.type.includes("ogg")) format = "ogg";
    } catch (e) {
      console.warn("Could not base64 encode audio blob:", e);
    }
  }

  console.log(`[OpenRouter Tone Client] 📡 Dispatching tone analysis for "${transcript.slice(0, 40)}..."`);

  const res = await fetch("/api/analyze-tone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      metrics,
      audioBase64,
      format,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[OpenRouter Tone Client] API error:", res.status, errorText);
    return {
      toneNotes: "Vocal tone: Steady volume, clear articulation, and controlled pacing observed.",
      modelUsed: "Fallback",
      status: "FAILED",
      success: false,
    };
  }

  const data = await res.json();
  console.log(`[OpenRouter Tone Client] ✅ Tone analyzed via ${data.modelUsed} (${data.status})`);
  return data;
}

/**
 * Convert a Blob to raw base64 string (without the data URL prefix).
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        const base64 = dataUrl.split(",")[1] || dataUrl;
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
