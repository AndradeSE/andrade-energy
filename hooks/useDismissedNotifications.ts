import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const cache = new Map<string, string[]>();
const listeners = new Map<string, Set<(ids: string[]) => void>>();
const queues = new Map<string, Promise<unknown>>();
const key = (userId: string) => `andrade_energy_notificacoes_ocultas_${userId}`;

function notify(userId: string, ids: string[]) {
  cache.set(userId, ids);
  listeners.get(userId)?.forEach((listener) => listener(ids));
}

function enqueue(userId: string, action: () => Promise<void>) {
  const next = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(action);
  queues.set(userId, next);
  return next;
}

export function useDismissedNotifications(userId?: string) {
  const [snapshot, setSnapshot] = useState<{ userId: string; ids: string[] } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const group = listeners.get(userId) ?? new Set<(ids: string[]) => void>();
    const listener = (ids: string[]) => setSnapshot({ userId, ids });
    group.add(listener);
    listeners.set(userId, group);
    if (cache.has(userId)) listener(cache.get(userId)!);
    void enqueue(userId, async () => {
      const saved = await AsyncStorage.getItem(key(userId));
      let ids: string[] = [];
      try {
        const parsed = JSON.parse(saved ?? "[]");
        if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === "string");
      } catch { /* Uma preferência local inválida não impede abrir as notificações. */ }
      notify(userId, [...new Set([...(cache.get(userId) ?? []), ...ids])]);
    }).catch(() => undefined);
    return () => {
      group.delete(listener);
      if (!group.size) listeners.delete(userId);
    };
  }, [userId]);

  return {
    ids: snapshot?.userId === userId ? snapshot?.ids ?? [] : [],
    dismissAll: (ids: string[]) => {
      if (!userId) return Promise.reject(new Error("Sessão indisponível"));
      return enqueue(userId, async () => {
        const next = [...new Set([...(cache.get(userId) ?? []), ...ids.map(String)])];
        await AsyncStorage.setItem(key(userId), JSON.stringify(next));
        notify(userId, next);
      });
    },
  };
}
