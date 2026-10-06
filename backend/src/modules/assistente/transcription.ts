export async function transcribeAudio(bytes: Buffer, mime: string, key: string, request: typeof fetch = fetch): Promise<string> {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), mime === "audio/webm" ? "speech.webm" : "speech.m4a");
  body.append("model", "whisper-large-v3-turbo");
  body.append("language", "pt");
  body.append("response_format", "json");
  body.append("temperature", "0");
  const response = await request("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${key}` }, body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "TRANSCRIPTION_QUOTA" : "TRANSCRIPTION_UNAVAILABLE");
  const result = await response.json() as { text?: unknown };
  return typeof result.text === "string" ? result.text.trim().slice(0, 1200) : "";
}
