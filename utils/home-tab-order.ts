export function orderHomeTab<T>(items: readonly T[], isHome: (item: T) => boolean): T[] {
  const homeIndex = items.findIndex(isHome);
  if (homeIndex < 0) return [...items];
  const ordered = items.filter((_, index) => index !== homeIndex);
  ordered.splice(items.length % 2 === 1 ? Math.floor(items.length / 2) : 0, 0, items[homeIndex]);
  return ordered;
}
