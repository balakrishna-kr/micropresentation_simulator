const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Reliable 100% FREE models cascade (Cost = $0.00 guaranteed, no credits deducted)
const TONE_MODELS = [
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3.5-lightning:free",
  "dots-studio/dots-3-note-preview:free",
  "openrouter/free",
];

const TONE_SYSTEM_PROMPT = `You are a strict, highly professional vocal coach and admissions assessor for top-tier undergraduate business programs.

Evaluate the speaker's vocal tone, pacing, speech delivery, and emotional composure based on the speech transcript and cadence metrics.
Be completely objective, strict, and candid. Do NOT give undeserved praise or sugarcoat mistakes.

Evaluate:
1. DELIVERY SERIOUSNESS & COMPOSURE: Did they speak with formal composure, or did they giggle, laugh nervously, break character, sigh, make casual remarks, or sound unprepared?
2. VOCAL FLUENCY & COHERENCE: Were there frequent stumbles, false starts, fillers ("um", "uh", "like"), long hesitations, or disjointed rambling?
3. PACING & SPEED: Evaluate delivery speed (~WPM) against optimal 130-160 WPM. Was it rushed, dragged, or erratic?
4. PROJECTION & CONVICTION: Did the voice convey conviction and clarity, or was it weak, hesitant, trailing off, or self-deprecating?
5. HONEST TONE VERDICT: Summarize whether the candidate sounded like a serious, prepared admissions applicant or an undisciplined candidate.

Keep response structured, candid, and under 180 words.`;

async function callOpenRouterTone(model, apiKey, userPrompt, audioBase64, format) {
  // Safety guard: Strictly enforce free models to guarantee $0.00 cost and protect user credits
  if (!model.endsWith(":free") && model !== "openrouter/free") {
    throw new Error(`Safety block: Model "${model}" is not free. Blocked to protect credits.`);
  }

  // If native audio data is provided and model is audio-capable, include input_audio
  let userMessageContent = userPrompt;
  if (audioBase64 && (format === "wav" || format === "mp3") && model.includes("inkling")) {
    userMessageContent = [
      { type: "text", text: userPrompt },
      {
        type: "input_audio",
        input_audio: {
          data: audioBase64,
          format: format === "mp3" ? "mp3" : "wav",
        },
      },
    ];
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://micropresentation-simulator.local",
      "X-Title": "MicroPresentation Simulator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: TONE_SYSTEM_PROMPT },
        { role: "user", content: userMessageContent },
      ],
      max_tokens: 450,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content || choice?.message?.reasoning;

  if (!text || text.trim().length === 0) {
    throw new Error(`Empty response from model ${model}`);
  }

  return text.trim();
}

async function callGroqFallback(userPrompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: TONE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 450,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

export async function POST(request) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n========================================`);
  console.log(`[OpenRouter Tone] 📡 [${timestamp}] Incoming Vocal Tone & Emotion Analysis Request`);

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const body = await request.json().catch(() => ({}));
    const transcript = body.transcript || body.text || "";
    const metrics = body.metrics || {};
    const audioBase64 = body.audioBase64 || null;
    const format = body.format || "webm";

    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    const durationSeconds = metrics.duration || 60;
    const wpm = Math.round((wordCount / (durationSeconds / 60))) || 140;

    let paceAssessment = "Moderate / Conversational";
    if (wpm < 115) paceAssessment = "Deliberate / Slower pace";
    else if (wpm > 165) paceAssessment = "Rapid / Fast-paced";

    const userPrompt = `SPEECH CADENCE & VOCAL METRICS:
- Total Duration: ~${durationSeconds} seconds
- Total Word Count: ${wordCount} words
- Delivery Rate: ~${wpm} WPM (${paceAssessment})
- Articulation: Continuous speech captured via Whisper

SPEECH TRANSCRIPT FOR TONAL EVALUATION:
"${transcript || "(Speech captured during presentation)"}"

Evaluate the candidate's vocal tone, pacing, pitch modulation, and emotional composure.`;

    // 1. Try OpenRouter models cascade
    if (apiKey) {
      for (const model of TONE_MODELS) {
        try {
          console.log(`[OpenRouter Tone] 🔄 Connecting to OpenRouter model: "${model}"...`);
          let toneNotes;
          try {
            toneNotes = await callOpenRouterTone(model, apiKey, userPrompt, audioBase64, format);
          } catch (audioErr) {
            // If audio-inclusive call fails (e.g. format issue), retry model with acoustic metrics & transcript
            console.warn(`[OpenRouter Tone] ℹ️ Model "${model}" audio payload note: ${audioErr.message}. Retrying with cadence metrics...`);
            toneNotes = await callOpenRouterTone(model, apiKey, userPrompt, null, null);
          }

          console.log(`[OpenRouter Tone] ✅ SUCCESS: Connected to "${model}" (Status: 200 OK)`);
          console.log(`[OpenRouter Tone] 📝 Notes generated: ${toneNotes.slice(0, 100)}...`);
          console.log(`========================================\n`);

          return Response.json({
            success: true,
            status: "CONNECTED",
            modelUsed: model,
            provider: "OpenRouter",
            wpm,
            toneNotes,
          });
        } catch (err) {
          console.warn(`[OpenRouter Tone] ⚠️ Failed on "${model}": ${err.message}`);
        }
      }
    }

    // 2. High-speed Groq fallback
    try {
      console.log(`[OpenRouter Tone] 🔄 Attempting fallback via Groq (openai/gpt-oss-120b)...`);
      const toneNotes = await callGroqFallback(userPrompt);

      console.log(`[OpenRouter Tone] ✅ SUCCESS: Connected via Groq fallback (Status: 200 OK)`);
      console.log(`========================================\n`);

      return Response.json({
        success: true,
        status: "CONNECTED",
        modelUsed: "openai/gpt-oss-120b",
        provider: "Groq",
        wpm,
        toneNotes,
      });
    } catch (groqErr) {
      console.error(`[OpenRouter Tone] ⚠️ Groq fallback also failed: ${groqErr.message}`);
    }

    console.log(`========================================\n`);

    return Response.json({
      success: true,
      status: "HEURISTIC",
      modelUsed: "Acoustic Cadence Engine",
      wpm,
      toneNotes: `DELIVERY RATE: Measured at ~${wpm} words per minute (${paceAssessment}).\nCADENCE & COMPOSURE: Speech duration was ~${durationSeconds}s for ${wordCount} words.\nNOTE: Evaluate vocal confidence, seriousness, and hesitation strictly based on transcript flow and self-corrections. Penalize any laughing, informal speech, or rambling.`,
    });
  } catch (error) {
    console.error(`[OpenRouter Tone] 💥 Critical server error:`, error);
    console.log(`========================================\n`);
    return Response.json(
      {
        success: false,
        status: "ERROR",
        modelUsed: "None",
        error: error.message,
        toneNotes:
          "NOTE ON VOCAL TONE: Automated tone server was unavailable. Evaluate vocal tone strictly based on transcript coherence and delivery discipline.",
      },
      { status: 200 }
    );
  }
}
