let activeLoaders = 0;
const listeners = new Set<() => void>();

export function setAssistantLoading(active: boolean) {
  activeLoaders = Math.max(0, activeLoaders + (active ? 1 : -1));
  listeners.forEach((listener) => listener());
}

export function subscribeAssistantLoading(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isAssistantLoading() {
  return activeLoaders > 0;
}
