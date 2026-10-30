import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "andrade.header-details-expanded.v1";
const listeners = new Set<() => void>();
let expanded = true;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

async function loadPreference() {
  if (loaded) return;
  loaded = true;
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored !== null) {
      expanded = stored === "true";
      emit();
    }
  } catch {
    // Mantém o cabeçalho aberto quando o armazenamento não está disponível.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHeaderDetailsVisibility() {
  const isExpanded = useSyncExternalStore(subscribe, () => expanded, () => expanded);

  useEffect(() => {
    void loadPreference();
  }, []);

  const setExpanded = useCallback((value: boolean) => {
    if (expanded === value) return;
    expanded = value;
    emit();
    void SecureStore.setItemAsync(STORAGE_KEY, String(value)).catch(() => undefined);
  }, []);

  return { isExpanded, setExpanded };
}
