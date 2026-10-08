import AsyncStorage from "@react-native-async-storage/async-storage";
import { environmentKeySuffix } from "../config/environment";

let hidden = false;
let loadedUser = "";
const listeners = new Set<() => void>();
const key = (userId: string) => `assistant-floating-hidden${environmentKeySuffix}:${userId}`;

export const floatingHidden = () => hidden;
export function subscribeFloatingHidden(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function notify() { listeners.forEach(listener => listener()); }

export async function loadFloatingPreference(userId: string) {
  if (!userId || loadedUser === userId) return;
  loadedUser = userId;
  hidden = false;
  notify();
  try {
    const stored = await AsyncStorage.getItem(key(userId));
    if (loadedUser === userId) { hidden = stored === "hidden"; notify(); }
  } catch { /* Falha no armazenamento mantém o botão visível. */ }
}

export async function setFloatingHidden(userId: string, value: boolean) {
  if (!userId) return;
  loadedUser = userId;
  hidden = value;
  notify();
  try { await AsyncStorage.setItem(key(userId), value ? "hidden" : "visible"); }
  catch { /* A preferência vale nesta sessão mesmo sem persistência. */ }
}
