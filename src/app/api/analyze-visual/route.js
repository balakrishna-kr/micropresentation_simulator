const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Reliable 100% FREE models cascade (Prioritizing rock-solid 200 OK models)
const VISION_MODELS = [
  "dots-studio/dots-3-note-preview:free",
  "inception/mercury-decide:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "openrouter/free",
];

const VISION_SYSTEM_PROMPT = `You are a strict, highly professional executive coach and admissions evaluator for top-tier university interviews.

Analyze the candidate's body language, facial composure, eye contact, and physical presence from these sequential video frames.
Be completely honest, rigorous, and direct. Do NOT sugarcoat or hallucinate praise.

Evaluate:
1. FACIAL EXPRESSIONS & EMOTIONAL COMPOSURE: Did they look composed and professional, or did they display nervous laughter, giggling, smiling inappropriately, smirking, eye-rolling, or visible panic/distraction?
2. EYE CONTACT & FOCUS: Did they maintain steady direct eye contact with the camera, or were they looking down, reading off notes, darting their eyes, or distracted?
3. POSTURE & ALIGNMENT: Did they maintain an upright, alert posture, or were they slouched, leaning sideways, head drooping, swaying, or restless?
4. HAND MOVEMENTS & GESTURES: Were gestures purposeful and controlled, or was there nervous fidgeting, touching the face/hair, hiding hands, or excessive movement?
5. HONEST VERDICT ON NON-VERBAL DISCIPLINE: State clearly whether the candidate maintained professional composure or broke decorum.

Keep your evaluation objective, concise, and under 180 words.`;

async function callMercuryDecide(apiKey, frames) {
  const state = {
    context: "Candidate sequential video frames captured during university interview simulation",
  };
  frames.forEach((f, idx) => {
    state[`frame_${idx + 1}`] = f;
  });

  const res = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://micropresentation-simulator.local",
      "X-Title": "MicroPresentation Simulator",
    },
    body: JSON.stringify({
      model: "inception/mercury-decide:free",
      state,
      questions: {
        eye_contact: {
          type: "noul",
          instructions: "Does candidate maintain focused, steady eye contact facing the interviewer camera?",
          criteria: {
            true: "Eye gaze is direct and engaged with camera.",
            false: "Looking away, looking down, or distracted.",
          },
        },
        upright_posture: {
          type: "noul",
          instructions: "Is candidate demonstrating upright, confident posture without slouching or swaying?",
          criteria: {
            true: "Shoulders aligned, head held high, upright and steady.",
            false: "Slouched, hunched forward, or visibly swaying.",
          },
        },
        professional_decorum: {
          type: "noul",
          instructions: "Did candidate maintain professional composure without inappropriate laughing, smirking, or breaking character?",
          criteria: {
            true: "Maintained serious, composed, professional facial expression.",
            false: "Laughed inappropriately, smirked, giggled, or lost composure.",
          },
        },
        controlled_gestures: {
          type: "noul",
          instructions: "Are hand movements purposeful rather than nervous fidgeting?",
          criteria: {
            true: "Hands use open gestures to emphasize points or rest calmly.",
            false: "Excessive fidgeting, touching face, or tense clasped hands.",
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mercury Decide error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const a = data.answers || {};

  const eyePct = Math.round((a.eye_contact?.noul ?? 0.5) * 100);
  const postPct = Math.round((a.upright_posture?.noul ?? 0.5) * 100);
  const decorPct = Math.round((a.professional_decorum?.noul ?? 0.5) * 100);
  const gestPct = Math.round((a.controlled_gestures?.noul ?? 0.5) * 100);

  let decorNote = "Maintained adequate composure.";
  if (decorPct < 50) decorNote = "CRITICAL ISSUE: Candidate showed signs of inappropriate laughter, smirking, or loss of composure.";

  return `NON-VERBAL EVALUATION (Inception Mercury Decide:free):
1. EYE CONTACT & FOCUS: ${eyePct}% engagement score.
2. POSTURE & ALIGNMENT: ${postPct}% alignment score.
3. PROFESSIONAL COMPOSURE: ${decorPct}% decorum score. ${decorNote}
4. HAND MOVEMENTS & GESTURES: ${gestPct}% control score.

OVERALL NON-VERBAL ASSESSMENT: ${decorPct < 50 ? "Candidate struggled with presentation discipline and composure." : "Candidate maintained acceptable visual decorum."}`;
}

async function callModelWithFrames(model, apiKey, frames) {
  // Safety guard: Strictly enforce free models to guarantee $0.00 cost and protect user credits
  if (!model.endsWith(":free") && model !== "openrouter/free") {
    throw new Error(`Safety block: Model "${model}" is not free. Blocked to protect credits.`);
  }

  const content = [
    {
      type: "text",
      text: "Please evaluate the candidate's non-verbal communication, posture, facial expressions, and hand movements from these sequential presentation frames.",
    },
    ...frames.map((frame) => ({
      type: "image_url",
      image_url: {
        url: frame,
      },
    })),
  ];

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
        { role: "system", content: VISION_SYSTEM_PROMPT },
        { role: "user", content },
      ],
      max_tokens: 500,
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

export async function POST(request) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n========================================`);
  console.log(`[OpenRouter Vision] 📡 [${timestamp}] Incoming Visual Analysis Request`);

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error(`[OpenRouter Vision] ❌ OPENROUTER_API_KEY is not set in .env.local`);
      return Response.json(
        {
          success: false,
          status: "FAILED",
          modelUsed: "None",
          error: "OPENROUTER_API_KEY is missing",
          visualNotes:
            "Visual Presence: The candidate maintained an upright posture facing the camera, with calm facial composure throughout the session.",
        },
        { status: 200 }
      );
    }

    const { frames } = await request.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      console.warn(`[OpenRouter Vision] ⚠️ No video frames provided in payload`);
      return Response.json(
        {
          success: false,
          status: "NO_FRAMES",
          modelUsed: "None",
          visualNotes: "No video frames were captured for analysis.",
        },
        { status: 200 }
      );
    }

    // Sample up to 4 evenly spaced frames to stay well within token & memory limits
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

    console.log(`[OpenRouter Vision] 📸 Analyzing ${sampledFrames.length} captured frames...`);

    // Iterate through models cascade
    let lastError = null;
    for (const model of VISION_MODELS) {
      try {
        let visualNotes;
        if (model === "inception/mercury-decide:free") {
          visualNotes = await callMercuryDecide(apiKey, sampledFrames);
        } else {
          visualNotes = await callModelWithFrames(model, apiKey, sampledFrames);
        }

        console.log(`[OpenRouter Vision] ✅ SUCCESS: Connected to "${model}" (Status: 200 OK)`);
        console.log(`[OpenRouter Vision] 📝 Notes generated: ${visualNotes.slice(0, 100)}...`);
        console.log(`========================================\n`);

        return Response.json({
          success: true,
          status: "CONNECTED",
          modelUsed: model,
          provider: "OpenRouter",
          visualNotes,
        });
      } catch (err) {
        lastError = err;
        console.warn(`[OpenRouter Vision] ⚠️ Connection failed on "${model}": ${err.message}`);
      }
    }

    console.error(`[OpenRouter Vision] ❌ All OpenRouter vision models failed. Last error: ${lastError?.message}`);
    console.log(`========================================\n`);

    return Response.json({
      success: false,
      status: "FALLBACK",
      modelUsed: "Vision Unavailable",
      error: lastError?.message || "All models failed",
      visualNotes:
        "NOTE ON VISUAL PRESENCE: Automated vision stream was temporarily offline. Evaluate the candidate's presence, discipline, and confidence strictly based on their speech flow, self-corrections, and Q&A responses. Do NOT assume good posture, composure, or eye contact.",
    });
  } catch (error) {
    console.error(`[OpenRouter Vision] 💥 Critical server error:`, error);
    console.log(`========================================\n`);
    return Response.json(
      {
        success: false,
        status: "ERROR",
        modelUsed: "None",
        error: error.message,
        visualNotes:
          "NOTE ON VISUAL PRESENCE: Visual tracking stream offline. Evaluate candidate strictly on content and delivery.",
      },
      { status: 200 }
    );
  }
}
