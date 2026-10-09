export function consumerEnergySummary(data: Record<string, any> | null) {
  const valid = (value: unknown) => { const number = Number(value ?? 0); return Number.isFinite(number) ? Math.max(0, number) : 0; };
  const compensated = valid(data?.ultimaFatura?.energiaCompensada);
  const consumed = valid(data?.consumo ?? compensated);
  return { compensated, consumed, injected: valid(data?.ultimaFatura?.energiaInjetada), stock: valid(data?.creditos), percentage: consumed > 0 ? Math.min(100, Math.round(compensated / consumed * 100)) : 0 };
}
