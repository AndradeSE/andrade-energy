import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNotificationReadStore } from "../utils/notificationReadStore";

const store = createNotificationReadStore(AsyncStorage);

export function useReadNotifications(userId?: string) {
  const [snapshot, setSnapshot] = useState<{ userId: string; ids: string[] } | null>(null);
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = store.subscribe(userId, (ids) => setSnapshot({ userId, ids }));
    void store.load(userId).catch(() => undefined);
    return unsubscribe;
  }, [userId]);
  return {
    ready: Boolean(userId && snapshot?.userId === userId),
    ids: snapshot?.userId === userId ? snapshot?.ids ?? [] : [],
    mark: (id: string) => userId ? store.mark(userId, id) : Promise.reject(new Error("Sessão indisponível")),
  };
}
