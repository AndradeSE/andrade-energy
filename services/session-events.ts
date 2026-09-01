type Listener = () => void;

const listeners = new Set<Listener>();

export function avisarSessaoSubstituida() {
  for (const listener of listeners) listener();
}

export function aoSubstituirSessao(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
