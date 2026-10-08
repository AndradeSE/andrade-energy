// A conversa iniciada por "Andrade" permanece sobre a tela atual.
let requestId = "";
const listeners = new Set<() => void>();

export function floatingConversationRequest() { return requestId; }
export function subscribeFloatingConversation(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function openFloatingConversation() {
  requestId = String(Date.now());
  listeners.forEach(listener => listener());
}
export function closeFloatingConversation() {
  requestId = "";
  listeners.forEach(listener => listener());
}
