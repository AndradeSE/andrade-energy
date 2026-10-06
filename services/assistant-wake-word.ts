// Escuta opcional e somente nesta sessão. Não é restaurada silenciosamente.
let enabled = false;
const listeners = new Set<() => void>();
export const wakeWordEnabled = () => enabled;
export function subscribeWakeWord(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setWakeWordEnabled(value: boolean) { enabled = value; listeners.forEach(listener => listener()); }
export function containsAssistantWakeWord(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return /\be\s+ai\s+(chat|chate|chatbot)\b/.test(normalized);
}
