import type { QuotaReading } from "./cotas.policy";

export const AZURE_QUOTA_CATALOG = [
  { servico: "AZURE", metrica: "voz_caracteres_mes", rotulo: "Azure Speech · voz por mês", unidade: "caracteres", automatico: true,
    observacao: "Consumo registrado no Azure Monitor, sujeito a atraso. Franquia do plano F0: 500 mil caracteres por mês; não inclui Gemini Live." },
  { servico: "AZURE", metrica: "transcricao_horas_mes", rotulo: "Azure Speech · transcrição por mês", unidade: "horas", automatico: true,
    observacao: "Consumo registrado no Azure Monitor, sujeito a atraso. Franquia F0: 5 horas mensais de transcrição padrão e personalizada compartilhadas." },
] as const;
const METRICS = ["SynthesizedCharacters", "AudioSecondsTranscribed"] as const;
const CLIENT = "766d0d04-da20-44e3-b949-bea45bd2fcda";
export function azureQuotaConfig(env: NodeJS.ProcessEnv) {
  const resource = String(env.AZURE_QUOTA_RESOURCE_ID ?? "");
  const tenant = String(env.AZURE_QUOTA_TENANT_ID ?? "");
  if (!/^\/subscriptions\/[a-f0-9-]{36}\/resourceGroups\/[a-z0-9_.()-]+\/providers\/Microsoft\.CognitiveServices\/accounts\/[a-z0-9-]+$/i.test(resource)
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(tenant)
    || env.MICROSOFT_OAUTH_CLIENT_ID !== CLIENT || !env.MICROSOFT_OAUTH_CLIENT_SECRET) return null;
  return { resource, tenant, client: CLIENT, secret: env.MICROSOFT_OAUTH_CLIENT_SECRET };
}
/** No observations is unavailable, never an invented zero balance. */
export function azureQuotaReadings(payload: any, sku: string, now = Date.now()): QuotaReading[] {
  if (sku !== "F0") throw new Error("PLANO_NAO_SUPORTADO");
  const start = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
  const reset = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth() + 1, 1)).toISOString();
  return METRICS.flatMap((metric, i) => {
    const matches = Array.isArray(payload?.value) ? payload.value.filter((item: any) => item?.name?.value === metric) : [];
    if (matches.length !== 1 || (matches[0].errorCode && matches[0].errorCode !== "Success")) return [];
    const series = matches[0].timeseries;
    // No dimension filter is requested: only the single aggregate series is accepted.
    if (!Array.isArray(series) || series.length !== 1 || (series[0].metadatavalues?.length ?? 0) !== 0 || !Array.isArray(series[0].data)) return [];
    const points = series[0].data.filter((point: any) => point.total !== null && point.total !== undefined);
    if (!points.length) return [];
    const seen = new Set<string>(); let total = 0;
    for (const point of points) {
      const timestamp = Date.parse(point.timeStamp);
      if (typeof point.total !== "number" || !Number.isFinite(point.total) || point.total < 0 || !Number.isFinite(timestamp) || timestamp < start || timestamp > now || seen.has(point.timeStamp)) return [];
      seen.add(point.timeStamp); total += point.total;
    }
    if (!Number.isFinite(total) || total >= 1e15) return [];
    return [{ servico: "AZURE", metrica: AZURE_QUOTA_CATALOG[i].metrica, rotulo: AZURE_QUOTA_CATALOG[i].rotulo,
      usado: i === 0 ? total : total / 3600, limite: i === 0 ? 500_000 : 5, renovaEm: reset, origem: "API_OFICIAL" }];
  });
}
export async function fetchAzureQuotaReadings(env: NodeJS.ProcessEnv, request: typeof fetch = fetch, now = Date.now()) {
  const config = azureQuotaConfig(env);
  if (!config) throw new Error("SEM_CHAVE");
  const tokenResponse = await request(`https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: config.client, client_secret: config.secret, scope: "https://management.azure.com/.default" }),
  });
  if (!tokenResponse.ok) throw new Error("SEM_PERMISSAO");
  const token = (await tokenResponse.json() as any)?.access_token;
  if (typeof token !== "string" || !token) throw new Error("SEM_PERMISSAO");
  const headers = { Authorization: `Bearer ${token}` };
  const resourceUrl = `https://management.azure.com${config.resource}`;
  const resourceResponse = await request(`${resourceUrl}?api-version=2025-06-01`, { headers, redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!resourceResponse.ok) throw new Error([401,403].includes(resourceResponse.status) ? "SEM_PERMISSAO" : "PROVEDOR_INDISPONIVEL");
  const account = await resourceResponse.json() as any;
  if (String(account?.id ?? "").toLowerCase() !== config.resource.toLowerCase() || account?.kind !== "SpeechServices" || account?.sku?.name !== "F0") throw new Error("PLANO_NAO_SUPORTADO");
  const start = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();
  const query = new URLSearchParams({ "api-version": "2023-10-01", metricnames: METRICS.join(","), aggregation: "Total", interval: "P1D", timespan: `${start}/${new Date(now).toISOString()}` });
  const metricsResponse = await request(`${resourceUrl}/providers/microsoft.insights/metrics?${query}`, { headers, redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!metricsResponse.ok) throw new Error([401,403].includes(metricsResponse.status) ? "SEM_PERMISSAO" : "PROVEDOR_INDISPONIVEL");
  return azureQuotaReadings(await metricsResponse.json(), account.sku.name, now);
}
