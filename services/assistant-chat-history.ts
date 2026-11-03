import * as SecureStore from "expo-secure-store";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { MemoryTurn } from "./assistant-conversation-memory";

const key = (scope: string) => `solar_chat_${bytesToHex(sha256(new TextEncoder().encode(scope))).slice(0,32)}`;
const queues = new Map<string, Promise<void>>();
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export async function loadChatHistory(scope: string): Promise<MemoryTurn[]> {
  try {
    await queues.get(scope);
    const parts = await Promise.all([0,1,2,3].map(i => SecureStore.getItemAsync(`${key(scope)}_${i}`)));
    const data = JSON.parse(parts.map(p => p ?? "").join("") || "null");
    if (!data || Date.now()-data.savedAt > 30*86400000 || !Array.isArray(data.turns)) return [];
    return data.turns.filter((t: MemoryTurn) => (t.from === "user" || t.from === "assistant") && typeof t.text === "string").slice(-20);
  } catch { return []; }
}
export function saveChatHistory(scope: string, turns: MemoryTurn[]) {
  const run = async () => {
    const recent = turns.slice(-20).map(t => ({from:t.from,text:t.text.slice(0,1200),private:t.private}));
    let value = JSON.stringify({savedAt:Date.now(),turns:recent});
    while (value.length > 3600 && recent.length) { recent.shift(); value=JSON.stringify({savedAt:Date.now(),turns:recent}); }
    for (let i=0;i<4;i++) await SecureStore.setItemAsync(`${key(scope)}_${i}`,value.slice(i*900,(i+1)*900),options);
  };
  const task = (queues.get(scope) ?? Promise.resolve()).then(run).catch(() => {});
  queues.set(scope,task);
  void task.finally(() => { if(queues.get(scope)===task) queues.delete(scope); });
}
