/**
 * Client-side helper to call our server-side Gemini proxy.
 * Keeps the API key safely on the server.
 */
export async function callGemini(action, payload) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Gemini API error: ${res.status}`);
  }

  return res.json();
}
