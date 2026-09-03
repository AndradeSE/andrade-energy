type Listener = () => void;

const listeners = new Set<Listener>();
const contaExcluidaListeners = new Set<Listener>();

export function avisarSessaoSubstituida() {
  for (const listener of listeners) listener();
}

export function aoSubstituirSessao(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function avisarContaExcluida() {
  for (const listener of contaExcluidaListeners) listener();
}

export function aoExcluirConta(listener: Listener) {
  contaExcluidaListeners.add(listener);
  return () => {
    contaExcluidaListeners.delete(listener);
  };
}
