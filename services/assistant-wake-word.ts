// Escuta opcional e somente nesta sessão. Não é restaurada silenciosamente.
let enabled = false;
let paused = false;
const listeners = new Set<() => void>();
export const wakeWordEnabled = () => enabled;
export const wakeWordPaused = () => paused;
export function setWakeWordPaused(value: boolean) { paused = value; listeners.forEach(listener => listener()); }
export function subscribeWakeWord(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setWakeWordEnabled(value: boolean) { enabled = value; listeners.forEach(listener => listener()); }
export function containsAssistantWakeWord(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return /\be\s+ai+\s+(chat|chate|chatbot)\b/.test(normalized);
}
