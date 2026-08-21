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
1. The student's self-introduction
2. Their presentation transcript on the assigned topic
3. Their Q&A responses (4 questions and answers)
4. Behavioral/visual analytics data (facial expressions, hand movements, eye contact logs)

Provide a comprehensive evaluation covering:

CONTENT AND STRUCTURE: How well-organized, factually accurate, and insightful was the presentation? Acknowledge what they did well before noting what could improve.
COMMUNICATION STYLE: Clarity of speech, vocabulary, confidence in delivery. Recognize effort and natural speaking style.
BODY LANGUAGE: Based on the visual analytics — eye contact consistency, hand gestures, facial expressiveness.
  IMPORTANT for hand gestures: Even small or minimal hand movements are perfectly acceptable and should be noted positively. Only flag hand gestures as a concern if the data shows absolutely ZERO movement throughout the entire session (all handsMoving values are false). A few instances of movement is fine.
  IMPORTANT for facial expressions: Interpret expressions generously. "Neutral" and "Calm" are perfectly normal for a focused presenter. "Focused" and "Thinking" are positive signs. Only "Nervous" or "Tense" sustained for a long period is a mild concern. Do not penalize someone for not smiling constantly — being composed is good.
Q AND A PERFORMANCE: How well did they handle follow-up questions? Were answers coherent and reasonably on-topic? Give credit for attempting answers even if not perfect.
EMOTIONAL COMPOSURE: Did they appear composed and present? Interpret the data kindly — most students will naturally feel some nervousness, which is completely normal.

TONE GUIDELINES:
- Start the evaluation on a positive note. Lead with what the student did well.
- Be honest but encouraging. Frame weaknesses as areas for growth, not failures.
- Use a warm, mentor-like tone — imagine you are coaching them to do better next time.
- Avoid harsh or discouraging language.

End with:
- 2-3 specific, actionable improvement suggestions framed as helpful tips
- An encouraging closing sentence
- A final score out of 10 (format: "SCORE: X/10")

SCORING GUIDELINES:
- 8 to 10: Strong presentation with good content, structure, and delivery.
- 6 to 7: Decent effort with clear room for improvement.
- 4 to 5: Needs significant work but shows some potential. The student made a genuine, constructive effort but has significant gaps.
- Below 4: The student barely attempted, was completely off-topic, or gave low-effort/lazy/empty responses (e.g. "don't know", "yes", "no", "skip", or silent/empty transcript answers).
- STRICT EFFORT CHECK: If the student did not answer most of the Q&A questions or gave extremely short, non-committal answers (e.g. less than 1-2 sentences of actual substance per question), you MUST score them below 4 (e.g. 1/10 to 3/10). Do NOT award a default 5/10 to a student who did not try. Be real, honest, and realistic.

CRITICAL FORMATTING RULES:
- Do NOT use any markdown formatting. No asterisks, no hash symbols, no bullet symbols.
- Use plain text only. Your response will be read aloud by a text-to-speech engine.
- Use section names followed by a colon, then your analysis on the same or next line.
- Separate sections with blank lines.

Be honest, direct, and constructive. This is meant to help the student improve. Be real and genuine, but also encouraging.
Keep the entire evaluation under 300 words so it can be read aloud in under 2 minutes.`,

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

You will receive the complete transcript of an 8-step personal interview session including:
1. Student's self-introduction
2. Their academic background (10th and 12th standard details)
3. Their favorite subject and responses to syllabus-based questions
4. Their extracurricular activities and responses to ECA questions
5. Their awareness of geopolitics/current affairs (if applicable)
6. Behavioral/physical metrics data (facial expressions, hand movements, eye contact)

Provide a comprehensive evaluation covering:

INTRODUCTION AND SELF-PRESENTATION: How well did the student introduce themselves? Was it clear, confident, and structured?

ACADEMIC KNOWLEDGE: Based on syllabus Q&A, how well do they understand their stated favorite subject? Did they demonstrate conceptual clarity?

EXTRACURRICULAR DEPTH: Did they speak meaningfully about their activities or give shallow responses? Do they reflect genuine involvement?

CURRENT AFFAIRS AWARENESS: If they engaged with the geopolitics section, how informed and articulate were they? If they skipped, note it neutrally without penalty.

COMMUNICATION AND BODY LANGUAGE: Based on the physical metrics data, comment on eye contact, composure, gesturing, and overall presence.

OVERALL IMPRESSION: Would this student leave a positive impression on an actual admissions panel?

TONE GUIDELINES:
- Start with what the student did well.
- Be honest but encouraging. Frame weaknesses as growth areas.
- Use a warm, mentor-like tone.

End with:
- 2-3 specific, actionable tips for improvement
- An encouraging closing sentence
- A final score out of 10 (format: "SCORE: X/10")

SCORING GUIDELINES:
- 8 to 10: Strong interview performance across multiple areas.
- 6 to 7: Decent effort with clear room for improvement.
- 4 to 5: Needs significant work but shows potential. The student made a genuine, constructive effort but has significant gaps.
- Below 4: The student barely participated, was completely off-topic, or gave low-effort/lazy/empty responses (e.g. repeating "don't know", "yes", "no", "skip", or empty answers).
- STRICT EFFORT CHECK: If the student did not answer most of the interview questions or gave extremely short, non-committal answers (e.g. less than 1-2 sentences of actual substance per question), you MUST score them below 4 (e.g. 1/10 to 3/10). Do NOT award a default 5/10 to a student who did not try. Be real, honest, and realistic.

CRITICAL FORMATTING RULES:
- Do NOT use any markdown formatting. No asterisks, no hash symbols, no bullet symbols.
- Use plain text only. Your response will be read aloud by a text-to-speech engine.
- Use section names followed by a colon, then your analysis on the same or next line.
- Separate sections with blank lines.
- Keep the entire evaluation under 350 words.`,

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
    console.error("Groq API error response:", errBody);
    throw new Error(`Groq API error: ${res.status} — ${errBody}`);
  }

  const data = await res.json();
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

STUDENT INTRODUCTION:
${payload.introduction || "(No introduction captured)"}

PRESENTATION TRANSCRIPT:
${payload.transcript || "(No transcript captured)"}

Q&A ROUND:
${payload.qaHistory && payload.qaHistory.length > 0
          ? payload.qaHistory
            .map(
              (qa, i) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(No answer)"}`
            )
            .join("\n\n")
          : "(No Q&A data)"
        }

VISUAL ANALYTICS LOG (sampled every 2 seconds):
${payload.visionLogs && payload.visionLogs.length > 0
          ? JSON.stringify(payload.visionLogs.slice(-30), null, 2)
          : "(No visual data captured)"
        }

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
      return `STUDENT INTRODUCTION:
${payload.introduction || "(No introduction captured)"}

ACADEMIC BACKGROUND:
- 10th Standard: ${payload.academicData?.board10th || "N/A"}, Marks: ${payload.academicData?.marks10th || "N/A"}
- 12th Standard: ${payload.academicData?.board12th || "N/A"}, Marks: ${payload.academicData?.marks12th || "N/A"}
${payload.academicData?.uploadedFileName ? `- 12th Marks Card uploaded: ${payload.academicData.uploadedFileName}` : ""}

FAVORITE SUBJECT: ${payload.favoriteSubject || "N/A"}

SYLLABUS-BASED Q&A:
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

ECA Q&A:
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

BEHAVIORAL ANALYSIS:
${payload.visionSummary || "(No visual data captured)"}

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
