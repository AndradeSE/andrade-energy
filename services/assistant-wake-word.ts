// Escuta opcional e somente nesta sessão. Não é restaurada silenciosamente.
let enabled = false;
let paused = false;
let ready = false;
let onlineConsent = false;
let expiresAt = 0;
export const wakeWordOnlineConsent = () => onlineConsent;
export const wakeWordRemainingMs = () => Math.max(0, expiresAt - Date.now());
let diagnosticUntil = 0;
export function armWakeWordDiagnostic() { diagnosticUntil = Date.now() + 60000; }
export function consumeWakeWordDiagnostic() {
  const armed = diagnosticUntil > Date.now();
  diagnosticUntil = 0;
  return armed;
}
const listeners = new Set<() => void>();
export const wakeWordEnabled = () => enabled;
export const wakeWordPaused = () => paused;
export const wakeWordReady = () => ready;
export function setWakeWordReady(value: boolean) { ready = value; listeners.forEach(listener => listener()); }
export function setWakeWordPaused(value: boolean) { paused = value; listeners.forEach(listener => listener()); }
export function subscribeWakeWord(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setWakeWordEnabled(value: boolean, allowOnline = false) {
  enabled = value;
  onlineConsent = value && allowOnline;
  expiresAt = value ? Date.now() + 60000 : 0;
  if (!value) ready = false;
  listeners.forEach(listener => listener());
}
export function containsAssistantWakeWord(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  // O reconhecedor pode juntar "e aí" ou escrever a interjeição como "ei/hey".
  // Exige a chamada + chat; mencionar só "chat" nunca ativa a conversa.
  // Variante observada no aparelho: "e,chate!". Aceitar apenas como
  // chamada isolada, para não ativar ao mencionar "e chat" numa frase comum.
  const shortCall = /^\s*e\s+(?:chat|chate)\s*$/.test(normalized);
  return shortCall || /\b(?:e\s*ai+|ei|hey|ai+)\s*(?:chat|chate|chatbot)\b/.test(normalized);
}
