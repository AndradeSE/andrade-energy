export function readNotificationIds(storage: Pick<Storage, "getItem">, key: string): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length <= 128))].slice(-2000) : [];
  } catch { return []; }
}
export function mergeNotificationIds(previous: string[], next: string[]): string[] {
  return [...new Set([...previous, ...next])].slice(-2000);
}
