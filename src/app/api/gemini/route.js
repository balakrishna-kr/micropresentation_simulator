const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const SYSTEM_PROMPTS = {
  // ─── EXISTING: Micro-Presentation ──────────────────
  generate_question: `You are a supportive, friendly micro-presentation evaluator for Indian undergraduate admissions (Management programs). 
You are conducting a Q&A round after the student has delivered a short presentation.

Your task: Generate exactly ONE follow-up question based on the student's presentation.

Rules:
- Focus on the basics: ask a very simple, direct question testing their core understanding of the presentation they just delivered.
- Keep the difficulty level moderate to easy.
- Keep it extremely short, conversational, and direct: maximum ONE simple sentence (under 15 words).
- Do NOT repeat questions that have already been asked.
- Respond with ONLY the question text, no preamble or labels.`,

  evaluate: `You are an expert micro-presentation evaluator for Indian undergraduate admissions (BBA/BCom/Management programs).

You will receive:
1. The student's self-introduction (accurate Whisper transcript)
2. Their presentation transcript on the assigned topic (accurate Whisper transcript)
3. Their Q&A responses (4 questions and answers transcribed via Whisper)
4. AI Visual & Non-Verbal Analysis (analyzed from video frames: facial expressions, gaze/eye contact, posture, hand gestures)
5. AI Vocal Tone & Emotion Analysis (analyzed from audio: pacing, pitch, vocal energy, emotional composure)

Provide an executive, highly professional evaluation covering:

OVERALL IMPRESSION:
A brief summary of how the student performed as an aspiring management student.

KEY STRENGTHS:
List exactly 2 to 3 distinct, specific strong points observed during the session (e.g., content clarity, specific gestures, composure, vocal pace).

AREAS FOR IMPROVEMENT:
List exactly 2 to 3 distinct, constructive weak points or areas where the candidate should polish their delivery or content.

CONTENT AND LOGICAL STRUCTURE:
How well-organized, factually sound, and convincing was the presentation? Did they address the core topic effectively?

BODY LANGUAGE AND NON-VERBAL PRESENCE:
Direct evaluation incorporating the visual analysis: eye contact with the camera, facial composure, hand gestures, and posture. Note if gestures were natural or if there was rigidity/distraction.

VOCAL TONE AND EMOTION:
Direct evaluation incorporating the audio tone analysis: speech rate, clarity of pronunciation, pitch modulation, pauses, and emotional confidence.

Q AND A PERFORMANCE:
How well did they think on their feet and address the 4 follow-up questions?

ACTIONABLE TIPS FOR NEXT ROUND:
2-3 concrete, high-impact tips.

FINAL VERDICT AND SCORE:
Provide an objective closing summary followed by the final score out of 10 in the exact format:
SCORE: X/10

SCORING GUIDELINES (STRICT & UNCOMPROMISING ADMISSIONS STANDARD):
- 9 to 10: Exceptional, executive-ready presentation. Rich factual substance, clear logical structure, authoritative vocal delivery, and immaculate professional composure.
- 7 to 8: Competent, well-prepared performance. Good command of topic, structured points, solid Q&A. Minor delivery polish needed.
- 5 to 6: Average / borderline attempt. Superficial content, noticeable hesitations, lack of analytical depth, or minor composure slips.
- 3 to 4: Poor attempt. Disorganized speech, major factual mistakes, nervous laughter, unprofessional giggling or smirking, slouched or restless posture, or struggling badly in Q&A.
- 1 to 2: Unacceptable / failed attempt. Incoherent rambling, laughing through the presentation, breaking decorum, completely off-topic, or giving non-answers.

STRICT PROFESSIONAL RULES:
- NEVER give unearned praise or falsely compliment confidence or posture if the student made frequent mistakes, rambled, or lost composure.
- If the candidate laughed, giggled, smirked, or broke character during a formal presentation, explicitly call it out as an immediate professionalism failure in AREAS FOR IMPROVEMENT and penalize the score heavily (score MUST be 4 or below).
- If the content was weak, superficial, or full of errors, state it directly and objectively. Be constructive, candid, and professional — like a real senior panel interviewer at Christ University, NMIMS, or IIM.

CRITICAL FORMATTING RULES:
- Do NOT use any markdown formatting. No asterisks, no hash symbols, no bullet points (use 1., 2., 3. or clean section titles).
- Use plain text only. Your response will be read aloud by a text-to-speech engine.
- Use section names followed by a colon, then your analysis on the same or next line.
- Separate sections with blank lines.
- Keep the entire evaluation concise (under 320 words) so it reads smoothly in under 2 minutes.`,

  // ─── NEW: Personal Interview ───────────────────────
  interview_syllabus_question: `You are a warm, encouraging interviewer for Indian undergraduate admissions.

Your task: Generate exactly ONE question about the given subject from the student's 12th standard (Class XII) syllabus.

Rules:
- Ask a conceptual question that tests core principles, key definitions, or basic real-world applications of the subject.
- The question should have moderate difficulty: it must test standard 12th grade level conceptual clarity, not trivial definitions ("what is X"), nor overly complex postgraduate theories.
- Keep the question concise, conversational, and direct: exactly 1-2 short sentences (under 25 words).
- Do NOT repeat questions that have already been asked.
- Respond with ONLY the question text, no preamble or labels.`,

  interview_eca_question: `You are a warm and conversational interviewer for Indian undergraduate admissions (Management programs).

Your task: Ask exactly ONE follow-up question about a specific extracurricular activity from the student's list.

Rules:
- Reference the specific event name.
- Ask a meaningful question about their role, key challenges they overcame, team management, or leadership experience.
- The question should be conversational, direct, and check moderate personal skills: exactly 1-2 short sentences (under 25 words).
- Do NOT repeat questions that have already been asked.
- Respond with ONLY the question text, no preamble or labels.`,

  interview_geopolitics_followup: `You are a friendly, analytical interviewer for Indian undergraduate admissions (Management programs).

The student has just shared their understanding of a current affairs or geopolitics topic. Your task: Ask exactly ONE follow-up question about what they said.

Rules:
- Ask a direct question testing critical thinking, key impacts, or their perspective on the issue they just described.
- The question should be moderately challenging to see their awareness, but not overly technical.
- Keep the question conversational and concise: exactly 1-2 short sentences (under 25 words).
- Respond with ONLY the question text, no preamble or labels.`,

  interview_evaluate: `You are an expert personal interview evaluator for Indian undergraduate admissions (BBA/BCom/Management programs).

You will receive the complete transcript and multimodal notes of an 8-step personal interview session including:
1. Student's self-introduction (Whisper transcript)
2. Academic background (10th and 12th standard details)
3. Favorite subject and responses to syllabus-based questions (Whisper transcripts)
4. Extracurricular activities and responses to ECA questions (Whisper transcripts)
5. Current affairs / geopolitics response (if engaged)
6. AI Visual & Non-Verbal Notes (facial expressions, eye contact, body language, hand gestures)
7. AI Vocal Tone & Emotion Notes (vocal tone, pitch, cadence, pauses, emotional confidence)

Provide an executive, comprehensive interview evaluation covering:

OVERALL INTERVIEW IMPRESSION:
A brief professional assessment of the candidate's interview presence and potential as an undergraduate admissions candidate.

KEY STRENGTHS:
List exactly 2 to 3 distinct, specific strong points observed (e.g. subject knowledge, articulation, composure, engaging eye contact).

AREAS FOR IMPROVEMENT:
List exactly 2 to 3 distinct, constructive weak points or areas where the candidate should improve (e.g. depth of answers, fidgeting, speech rush, hesitation).

ACADEMIC & CONCEPTUAL CLARITY:
Based on syllabus Q&A, how well do they understand their chosen subject? Did they demonstrate genuine conceptual clarity?

EXTRACURRICULAR DEPTH:
Did they speak meaningfully about their activities with concrete experiences or were responses surface-level?

BODY LANGUAGE & VISUAL PRESENCE:
Direct evaluation incorporating visual notes: eye contact with camera, posture, facial composure, and hand gestures.

VOCAL TONE & EMOTIONAL COMPOSURE:
Direct evaluation incorporating vocal notes: clarity, pacing, volume, and poise under questioning.

ACTIONABLE TIPS FOR ADMISSIONS SUCCESS:
2-3 specific, high-value coaching tips.

FINAL VERDICT AND SCORE:
Provide an objective closing summary followed by the final score out of 10 in the exact format:
SCORE: X/10

SCORING GUIDELINES (STRICT & UNCOMPROMISING ADMISSIONS STANDARD):
- 9 to 10: Outstanding interview performance across all domains. Flawless professional demeanor, articulate answers, deep conceptual knowledge, and natural composure.
- 7 to 8: Strong candidate. Good preparation, clear articulation, minor delivery polish needed.
- 5 to 6: Average / borderline candidate. Superficial answers, noticeable hesitations, lack of analytical depth, or minor composure slips.
- 3 to 4: Weak candidate. Struggled badly with subject questions, laughed nervously, broke character, gave one-word non-committal answers, or lacked basic preparation.
- 1 to 2: Unacceptable performance. Disrespectful, continuous laughter, refusing to answer, or completely unprepared.

STRICT PROFESSIONAL RULES:
- NEVER give unearned praise or falsely praise confidence/posture if the candidate made frequent mistakes or lost composure.
- If the candidate laughed, giggled, smirked, or broke character, explicitly call it out as an immediate professionalism failure in AREAS FOR IMPROVEMENT and penalize the score heavily (score MUST be 4 or below).
- Be constructive, candid, and direct — like a real senior university admissions panel.

CRITICAL FORMATTING RULES:
- Do NOT use any markdown formatting. No asterisks, no hash symbols, no bullet points.
- Use plain text only. Your response will be read aloud by a text-to-speech engine.
- Use section names followed by a colon, then your analysis on the same or next line.
- Separate sections with blank lines.
- Keep the entire evaluation concise (under 350 words).`,

  analyze_marks_card: `You are an expert document reader. You are given an image of a student's 12th standard (Class XII) marks card or report card from an Indian education board.

Your task: Extract all the SUBJECT NAMES listed on the marks card.

Rules:
- Return ONLY a JSON array of subject name strings. Example: ["Physics", "Chemistry", "Mathematics", "English", "Computer Science"]
- Include all subjects you can clearly identify from the marks card.
- Use standard, clean subject names (e.g., "Accountancy" not "ACCTCY", "Business Studies" not "BST").
- Do NOT include language subjects unless they are clearly listed (e.g., "English", "Hindi", "Kannada").
- If you cannot read or identify any subjects, return: ["Accountancy", "Business Studies", "Economics"]
- Return ONLY the JSON array, nothing else. No explanation, no preamble.`,
};

async function callGroq(systemPrompt, userPrompt) {
  console.log(`[Groq LLM Engine] 📡 Calling Groq model: "${GROQ_MODEL}"...`);
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[Groq LLM Engine] ❌ Groq API error response:", errBody);
    throw new Error(`Groq API error: ${res.status} — ${errBody}`);
  }

  const data = await res.json();
  console.log(`[Groq LLM Engine] ✅ SUCCESS: Groq model responded (Status: 200 OK)`);
  return data.choices[0].message.content;
}

// Vision model for image analysis (marks card reading)
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

async function callGroqVision(systemPrompt, imageBase64) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all subject names from this marks card image." },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Groq Vision API error response:", errBody);
    throw new Error(`Groq Vision API error: ${res.status} — ${errBody}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── BUILD USER PROMPTS ──────────────────────────────
function buildUserPrompt(action, payload) {
  switch (action) {
    case "generate_question":
      return `PRESENTATION TOPIC: ${payload.topic}

PRESENTATION TRANSCRIPT:
${payload.transcript || "(No transcript captured)"}

PREVIOUS Q&A:
${payload.qaHistory && payload.qaHistory.length > 0
          ? payload.qaHistory
            .map(
              (qa, i) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(No answer)"}`
            )
            .join("\n\n")
          : "(No previous questions)"
        }

Generate the next probing question:`;

    case "evaluate":
      return `TOPIC: ${payload.topic}

STUDENT INTRODUCTION (WHISPER TRANSCRIPT):
${payload.introduction || "(No introduction captured)"}

PRESENTATION TRANSCRIPT (WHISPER TRANSCRIPT):
${payload.transcript || "(No transcript captured)"}

Q&A ROUND (WHISPER TRANSCRIPTS):
${payload.qaHistory && payload.qaHistory.length > 0
          ? payload.qaHistory
            .map(
              (qa, i) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(No answer)"}`
            )
            .join("\n\n")
          : "(No Q&A data)"
        }

AI VISUAL & NON-VERBAL ANALYSIS:
${payload.visualNotes || (payload.visionLogs && JSON.stringify(payload.visionLogs.slice(-20))) || "(No visual analysis available)"}

AI VOCAL TONE & EMOTION ANALYSIS:
${payload.toneNotes || "(No vocal tone analysis available)"}

Provide your comprehensive evaluation:`;

    case "interview_syllabus_question":
      return `SUBJECT: ${payload.subject}

PREVIOUS QUESTIONS ASKED:
${payload.previousQuestions && payload.previousQuestions.length > 0
          ? payload.previousQuestions.map((q, i) => `Q${i + 1}: ${q}`).join("\n")
          : "(No previous questions)"
        }

Generate the next question about this subject from the 12th standard syllabus:`;

    case "interview_eca_question":
      return `STUDENT'S EXTRACURRICULAR ACTIVITIES:
${payload.ecaList && payload.ecaList.length > 0
          ? payload.ecaList
            .map((e, i) => `${i + 1}. ${e.eventName} — Result: ${e.result}`)
            .join("\n")
          : "(No ECA data)"
        }

PREVIOUS QUESTIONS ASKED:
${payload.previousQuestions && payload.previousQuestions.length > 0
          ? payload.previousQuestions.map((q, i) => `Q${i + 1}: ${q}`).join("\n")
          : "(No previous questions)"
        }

Ask a follow-up question about one of their extracurricular activities:`;

    case "interview_geopolitics_followup":
      return `STUDENT'S RESPONSE ABOUT CURRENT AFFAIRS/GEOPOLITICS:
${payload.studentResponse || "(No response captured)"}

Ask one sharp follow-up question that challenges or expands on what they said:`;

    case "interview_evaluate":
      return `STUDENT INTRODUCTION (WHISPER TRANSCRIPT):
${payload.introduction || "(No introduction captured)"}

ACADEMIC BACKGROUND:
- 10th Standard: ${payload.academicData?.board10th || "N/A"}, Marks: ${payload.academicData?.marks10th || "N/A"}
- 12th Standard: ${payload.academicData?.board12th || "N/A"}, Marks: ${payload.academicData?.marks12th || "N/A"}
${payload.academicData?.uploadedFileName ? `- 12th Marks Card uploaded: ${payload.academicData.uploadedFileName}` : ""}

FAVORITE SUBJECT: ${payload.favoriteSubject || "N/A"}

SYLLABUS-BASED Q&A (WHISPER TRANSCRIPTS):
${payload.syllabusQA && payload.syllabusQA.length > 0
          ? payload.syllabusQA
            .map(
              (qa, i) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(No answer)"}`
            )
            .join("\n\n")
          : "(No syllabus Q&A data)"
        }

EXTRACURRICULAR ACTIVITIES:
${payload.ecaList && payload.ecaList.length > 0
          ? payload.ecaList
            .map((e, i) => `${i + 1}. ${e.eventName} — ${e.result}`)
            .join("\n")
          : "(No ECA data)"
        }

ECA Q&A (WHISPER TRANSCRIPTS):
${payload.ecaQA && payload.ecaQA.length > 0
          ? payload.ecaQA
            .map(
              (qa, i) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(No answer)"}`
            )
            .join("\n\n")
          : "(No ECA Q&A data)"
        }

GEOPOLITICS/CURRENT AFFAIRS:
${payload.geopoliticsEngaged ? `Student chose to engage.\nStudent's knowledge: ${payload.geopoliticsResponse || "(No response)"}\nFollow-up Q: ${payload.geopoliticsFollowup?.question || "N/A"}\nFollow-up A: ${payload.geopoliticsFollowup?.answer || "N/A"}` : "Student chose to skip this section."}

AI VISUAL & NON-VERBAL ANALYSIS:
${payload.visualNotes || payload.visionSummary || "(No visual data available)"}

AI VOCAL TONE & EMOTION ANALYSIS:
${payload.toneNotes || "(No vocal tone data available)"}

Provide your comprehensive interview evaluation:`;

    default:
      return "";
  }
}

export async function POST(request) {
  try {
    const { action, payload } = await request.json();

    if (!action || !payload) {
      return Response.json(
        { error: "Missing action or payload" },
        { status: 400 }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[action];
    if (!systemPrompt) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    // Special handling for vision-based marks card analysis
    if (action === "analyze_marks_card") {
      if (!payload.imageBase64) {
        return Response.json(
          { error: "No image provided for marks card analysis" },
          { status: 400 }
        );
      }
      const text = await callGroqVision(systemPrompt, payload.imageBase64);
      // Parse JSON array from the response
      let subjects = [];
      try {
        // Strip any markdown code fences if present
        const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        subjects = JSON.parse(cleaned);
        if (!Array.isArray(subjects)) subjects = [];
      } catch {
        console.error("Failed to parse vision response as JSON:", text);
        subjects = [];
      }
      return Response.json({ text, subjects });
    }

    const userPrompt = buildUserPrompt(action, payload);

    if (!userPrompt) {
      return Response.json(
        { error: "Could not build prompt for action" },
        { status: 400 }
      );
    }

    const text = await callGroq(systemPrompt, userPrompt);

    // Extract score if present in evaluation
    let score = null;
    if (action === "evaluate" || action === "interview_evaluate") {
      const scoreMatch = text.match(/SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
      if (scoreMatch) {
        score = parseFloat(scoreMatch[1]);
      }
    }

    return Response.json({ text, score });
  } catch (error) {
    console.error("Groq API error:", error);
    return Response.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
