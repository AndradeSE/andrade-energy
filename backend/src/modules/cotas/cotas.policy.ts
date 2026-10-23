export type QuotaReading = { servico: string; metrica: string; rotulo: string; usado: number; limite: number | null; renovaEm: string; origem: "API_OFICIAL" | "PAINEL_CONFIRMADO" };
export function resendUsageKey(env: NodeJS.ProcessEnv) {
  return [env.RESEND_USAGE_API_KEY, env.RESEND_API_KEY, env.RESEND_INBOUND_API_KEY]
    .map(value => String(value ?? "").trim()).find(Boolean) ?? "";
}
export const QUOTA_CATALOG = [
  { servico: "RESEND", metrica: "emails_dia", rotulo: "Resend · e-mails por dia", unidade: "e-mails", automatico: true },
  { servico: "RESEND", metrica: "emails_mes", rotulo: "Resend · e-mails por mês", unidade: "e-mails", automatico: true },
  { servico: "BREVO", metrica: "emails_dia", rotulo: "Brevo · envios por dia", unidade: "e-mails", automatico: true },
] as const;
/** Account credits are REMAINING, not sent. Only the documented free plan has a known 300/day limit. */
export function brevoReading(payload: any, now = Date.now()): QuotaReading {
  const plans = Array.isArray(payload?.plan) ? payload.plan.filter((p: any) => p?.type === "free" && p?.creditsType === "sendLimit") : [];
  if (plans.length !== 1 || typeof plans[0].credits !== "number" || !Number.isFinite(plans[0].credits) || plans[0].credits < 0 || plans[0].credits > 300) {
    throw new Error("Plano ou leitura do Brevo não suportado.");
  }
  const nextDay = new Date(now); nextDay.setUTCHours(24, 0, 0, 0);
  return { servico: "BREVO", metrica: "emails_dia", rotulo: "Brevo · envios por dia", usado: 300 - plans[0].credits, limite: 300,
    renovaEm: nextDay.toISOString(), origem: "API_OFICIAL" };
}
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
