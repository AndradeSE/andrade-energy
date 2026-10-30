export type GeminiAnswerPayload = {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
};

export function geminiAnswer(payload: GeminiAnswerPayload): string | undefined {
  const text = payload.candidates?.[0]?.content?.parts
    ?.filter(part => !part.thought)
    .map(part => part.text ?? "").join(" ").trim();
  if (!text) return undefined;
  if (text.length <= 800) return text;
  // A valid answer is not a connection error. Keep complete sentences when
  // possible, otherwise stop at a word boundary with a visible ellipsis.
  const bounded = text.slice(0, 797);
  const sentenceEnd = Math.max(bounded.lastIndexOf(". "), bounded.lastIndexOf("! "), bounded.lastIndexOf("? "));
  if (sentenceEnd >= 400) return bounded.slice(0, sentenceEnd + 1);
  const wordEnd = bounded.lastIndexOf(" ");
  return `${bounded.slice(0, wordEnd > 0 ? wordEnd : bounded.length)}…`;
}
