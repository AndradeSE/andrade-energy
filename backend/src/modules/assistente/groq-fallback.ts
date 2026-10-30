import { geminiAnswer } from "./gemini-answer";
import { redactConversationText } from "./conversation-text";

type Turn = { role: string; text: string };
let unavailableUntil = 0;

// Credentials stay server-side. Never log prompts, provider bodies or keys.
export async function groqFallback(system: string, question: string, history: Turn[]): Promise<string | undefined> {
  const key = process.env.GROQ_ASSISTANT_API_KEY?.trim();
  if (!key || Date.now() < unavailableUntil) return undefined;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_ASSISTANT_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: system },
          ...history.map(turn => ({ role: turn.role === "model" ? "assistant" : "user", content: redactConversationText(turn.text) })),
          { role: "user", content: redactConversationText(question) }],
        temperature: 0.2, max_completion_tokens: 400,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn("Groq fallback unavailable, provider status:", response.status);
      if (response.status === 429 || response.status >= 500) unavailableUntil = Date.now() + 30_000;
      return undefined;
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return undefined;
    return geminiAnswer({ candidates: [{ content: { parts: [{ text: content }] } }] });
  } catch {
    console.warn("Groq fallback failed");
    return undefined;
  }
}
