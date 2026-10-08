// A conversa iniciada por "Andrade" permanece sobre a tela atual.
let requestId = "";
let phase: "idle" | "connecting" | "listening" | "speaking" = "idle";
export function floatingConversationPhase() { return phase; }
export function setFloatingConversationPhase(value: typeof phase) { phase = value; listeners.forEach(listener => listener()); }
const listeners = new Set<() => void>();

export function floatingConversationRequest() { return requestId; }
export function subscribeFloatingConversation(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function openFloatingConversation() {
  requestId = String(Date.now());
  phase = "connecting";
  listeners.forEach(listener => listener());
}
export function closeFloatingConversation() {
  requestId = "";
  phase = "idle";
  listeners.forEach(listener => listener());
}
