export type MemoryTurn = { from: "user" | "assistant"; text: string; private?: boolean };

// Bounded by characters as well as turns; private data never enters online memory.
export function conversationMemory(turns: MemoryTurn[], mode: "online" | "local"): MemoryTurn[] {
  const eligible = turns.filter(turn => turn.text.trim() && (mode === "local" || !turn.private));
  let budget = mode === "online" ? 24000 : 4500;
  const result: MemoryTurn[] = [];
  for (const turn of eligible.slice(mode === "online" ? -24 : -12).reverse()) {
    if (!budget) break;
    const text = turn.text.slice(0, Math.min(mode === "online" ? 4000 : 1500, budget));
    result.unshift({ ...turn, text });
    budget -= text.length;
  }
  return result;
}
