type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const normalize = (id: string) => id.replace(/^(vencida-|vence-)/, "");
function parse(value: string | null): string[] {
  try { const ids = JSON.parse(value ?? "[]"); return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string").map(normalize) : []; }
  catch { return []; }
}

export function createNotificationReadStore(storage: Storage) {
  const cache = new Map<string, string[]>();
  const listeners = new Map<string, Set<(ids: string[]) => void>>();
  const queues = new Map<string, Promise<unknown>>();
  const key = (user: string) => `andrade_energy_notificacoes_lidas_${user}`;
  function enqueue<T>(user: string, action: () => Promise<T>): Promise<T> {
    const next = (queues.get(user) ?? Promise.resolve()).catch(() => undefined).then(action);
    queues.set(user, next);
    return next;
  }
  function notify(user: string, ids: string[]) {
    cache.set(user, ids);
    listeners.get(user)?.forEach((listener) => listener(ids));
  }
  async function read(user: string) {
    const [saved, legacy] = await Promise.all([storage.getItem(key(user)), storage.getItem("andrade_energy_notificacoes_lidas")]);
    return [...new Set([...(cache.get(user) ?? []), ...parse(saved), ...parse(legacy)])];
  }
  return {
    load(user: string) { return enqueue(user, async () => { const ids = await read(user); notify(user, ids); return ids; }); },
    mark(user: string, id: string) {
      return enqueue(user, async () => {
        const ids = [...new Set([...(await read(user)), normalize(String(id))])];
        // Persist before reporting success; never write a stale component snapshot.
        await storage.setItem(key(user), JSON.stringify(ids));
        notify(user, ids);
      });
    },
    subscribe(user: string, listener: (ids: string[]) => void) {
      const group = listeners.get(user) ?? new Set();
      group.add(listener); listeners.set(user, group);
      const ids = cache.get(user); if (ids) listener(ids);
      return () => { group.delete(listener); if (!group.size) listeners.delete(user); };
    },
  };
}
