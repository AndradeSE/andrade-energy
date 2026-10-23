export type QuotaReading = { servico: string; metrica: string; rotulo: string; usado: number; limite: number | null; renovaEm: string; origem: "API_OFICIAL" | "PAINEL_CONFIRMADO" };
export function resendUsageKey(env: NodeJS.ProcessEnv) {
  return [env.RESEND_USAGE_API_KEY, env.RESEND_API_KEY, env.RESEND_INBOUND_API_KEY]
    .map(value => String(value ?? "").trim()).find(Boolean) ?? "";
}
export const QUOTA_CATALOG = [
  { servico: "RESEND", metrica: "emails_dia", rotulo: "Resend · e-mails por dia", unidade: "e-mails", automatico: true },
  { servico: "RESEND", metrica: "emails_mes", rotulo: "Resend · e-mails por mês", unidade: "e-mails", automatico: true },
  { servico: "RENDER", metrica: "horas_gratuitas", rotulo: "Render · horas gratuitas", unidade: "horas", automatico: false },
  { servico: "NETLIFY", metrica: "creditos", rotulo: "Netlify · créditos", unidade: "créditos", automatico: false },
  { servico: "SUPABASE", metrica: "armazenamento", rotulo: "Supabase · armazenamento", unidade: "MB", automatico: false },
] as const;
export function quotaBand(used: number, limit: number | null): 0 | 80 | 90 | 100 {
  if (!Number.isFinite(used) || used < 0 || limit === null || !Number.isFinite(limit) || limit <= 0) return 0;
  const pct = used / limit * 100;
  return pct >= 100 ? 100 : pct >= 90 ? 90 : pct >= 80 ? 80 : 0;
}
export function resendReadings(payload: any, now = Date.now()): QuotaReading[] {
  return (["daily", "monthly"] as const).map((window, i) => {
    const reading = payload?.emails?.[window];
    const reset = Date.parse(reading?.resets_at);
    if (!reading || typeof reading.used !== "number" || !Number.isFinite(reading.used) || reading.used < 0 ||
      !(reading.limit === null || (typeof reading.limit === "number" && Number.isFinite(reading.limit) && reading.limit > 0)) ||
      !Number.isFinite(reset) || reset <= now || reset - now > 40 * 86400_000) throw new Error("Leitura de cota inválida.");
    return { servico: "RESEND", metrica: QUOTA_CATALOG[i].metrica, rotulo: QUOTA_CATALOG[i].rotulo,
      usado: reading.used, limite: reading.limit, renovaEm: new Date(reset).toISOString(), origem: "API_OFICIAL" };
  });
}
