type Store = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };

/** Serialize migration/save/logout so a delayed migration cannot restore a logged-out session. */
export function createSecureSession(secure: Store, legacy: Store, legacyKey: string, key: string) {
  let pending: Promise<unknown> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation, operation);
    pending = result.catch(() => undefined);
    return result;
  };
  const manifest = async () => {
    const raw = await secure.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!/^[a-z0-9]+$/.test(value.id) || !Number.isInteger(value.count) || value.count < 1 || value.count > 256) throw new Error("Sessão segura inválida.");
    return value as { id: string; count: number };
  };
  const erase = async (value: { id: string; count: number } | null) => {
    if (value) await Promise.all(Array.from({ length: value.count }, (_, i) => secure.removeItem(`${key}.${value.id}.${i}`)));
  };
  const write = async (value: unknown) => {
    const json = JSON.stringify(value);
    if (!json || json.length > 102400) throw new Error("Sessão excede o tamanho permitido.");
    const old = await manifest();
    const next = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), count: Math.ceil(json.length / 400) };
    try {
      for (let i = 0; i < next.count; i++) await secure.setItem(`${key}.${next.id}.${i}`, json.slice(i * 400, (i + 1) * 400));
      // Publish only after every encrypted chunk is persisted.
      await secure.setItem(key, JSON.stringify(next));
    } catch (error) { await erase(next).catch(() => undefined); throw error; }
    await legacy.removeItem(legacyKey);
    await erase(old).catch(() => undefined);
  };
  return {
    save: (value: unknown) => serial(() => write(value)),
    get: () => serial(async () => {
      const current = await manifest();
      if (current) {
        const parts = await Promise.all(Array.from({ length: current.count }, (_, i) => secure.getItem(`${key}.${current.id}.${i}`)));
        if (parts.some(part => part === null)) throw new Error("Sessão segura incompleta. Entre novamente.");
        await legacy.removeItem(legacyKey);
        return JSON.parse(parts.join(""));
      }
      const raw = await legacy.getItem(legacyKey);
      if (!raw) return null;
      const value = JSON.parse(raw);
      await write(value);
      return value;
    }),
    remove: () => serial(async () => {
      const current = await manifest();
      // Remove the fallback first, preventing resurrection after logout.
      await legacy.removeItem(legacyKey);
      await secure.removeItem(key);
      await erase(current);
    }),
  };
}
