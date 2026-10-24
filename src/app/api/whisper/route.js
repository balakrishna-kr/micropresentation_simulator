const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n========================================`);
  console.log(`[Groq Whisper] 📡 [${timestamp}] Incoming Audio Transcription Request`);

  try {
    if (!process.env.GROQ_API_KEY) {
      console.error(`[Groq Whisper] ❌ GROQ_API_KEY is not configured`);
      return Response.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") || formData.get("audio");

    if (!file) {
      console.warn(`[Groq Whisper] ⚠️ No audio file in form data`);
      return Response.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Check if file is practically empty
    if (file.size < 500) {
      console.log(`[Groq Whisper] ℹ️ Audio file is too short/empty (<500 bytes), skipping transcription`);
      console.log(`========================================\n`);
      return Response.json({ text: "", success: true, status: "EMPTY" });
    }

    console.log(`[Groq Whisper] 🔄 Forwarding ${file.size} bytes to Groq model: "whisper-large-v3"...`);

    const groqFormData = new FormData();
    groqFormData.append("file", file);
    groqFormData.append("model", "whisper-large-v3");
    groqFormData.append("response_format", "json");
    groqFormData.append("temperature", "0");

    const res = await fetch(GROQ_WHISPER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Groq Whisper] ⚠️ Groq API responded with status ${res.status}:`, errText);
      console.log(`========================================\n`);

      if (res.status === 400 && errText.includes("audio")) {
        return Response.json({ text: "", success: true, status: "SILENCE" });
      }
      return Response.json(
        { error: `Groq Whisper error: ${res.status}`, success: false, status: "ERROR" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const transcriptText = data.text ? data.text.trim() : "";
    const words = transcriptText.split(/\s+/).filter(Boolean).length;

    console.log(`[Groq Whisper] ✅ SUCCESS: Connected & Transcribed ${words} words`);
    if (transcriptText) {
      console.log(`[Groq Whisper] 💬 Preview: "${transcriptText.slice(0, 100)}${transcriptText.length > 100 ? '...' : ''}"`);
    }
    console.log(`========================================\n`);

    return Response.json({
      text: transcriptText,
      success: true,
      status: "CONNECTED",
      modelUsed: "whisper-large-v3",
      provider: "Groq",
      wordCount: words,
    });
  } catch (error) {
    console.error(`[Groq Whisper] 💥 Critical server error:`, error);
    console.log(`========================================\n`);
    return Response.json(
      { error: error.message || "Whisper transcription failed", success: false, status: "ERROR" },
      { status: 500 }
    );
  }
}
