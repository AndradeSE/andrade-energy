import { supabase } from "../../config/supabase";
import {capmonsterQuota} from './capmonsterQuota';
import { AZURE_QUOTA_CATALOG, azureQuotaConfig, azureQuotaEnabled, fetchAzureQuotaReadings } from "./azureQuotas";
import { QUOTA_CATALOG, quotaBand, resendReadings, resendUsageKey, brevoReading, type QuotaReading } from "./cotas.policy";

export function quotaEnvironment() {
  return /qqhcjieymypowunkixmk/.test(process.env.SUPABASE_URL ?? "") ? "preview" : "production";
}
async function saveReading(reading: QuotaReading) {
  const { error } = await supabase.rpc("registrar_cota_servico", {
    p_ambiente: quotaEnvironment(), p_servico: reading.servico, p_metrica: reading.metrica,
    p_renova_em: reading.renovaEm, p_rotulo: reading.rotulo, p_usado: reading.usado,
    p_limite: reading.limite, p_origem: reading.origem,
  });
  if (error) throw new Error("Não foi possível registrar a leitura de cota.");
}
async function monitorResendQuota() {
  const env = quotaEnvironment();
  const key = resendUsageKey(process.env);
  if (!key) {
    // Another collector may have the provider key. Do not replace its successful
    // reading with the configuration state of a standby instance.
    const result = await supabase.from("cotas_consultas").upsert({ ambiente: env, servico: "RESEND", status: "SEM_CHAVE", consultado_em: new Date().toISOString() }, { onConflict: "ambiente,servico", ignoreDuplicates: true });
    if (result.error) throw new Error("Não foi possível registrar o estado do monitor de cotas.");
    return;
  }
  let status = "SEM_CHAVE";
  if (key) {
    try {
      const response = await fetch("https://api.resend.com/usage", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const readings = resendReadings(await response.json());
        for (const reading of readings) await saveReading(reading);
        status = "OK";
      } else status = [401, 403].includes(response.status) ? "SEM_PERMISSAO" : "PROVEDOR_INDISPONIVEL";
    } catch { status = "CONSULTA_INDISPONIVEL"; }
  }
  const { error } = await supabase.from("cotas_consultas").upsert({ ambiente: env, servico: "RESEND", status, consultado_em: new Date().toISOString() });
  if (error) throw new Error("Não foi possível registrar o estado do monitor de cotas.");
}
async function monitorBrevoQuota() {
  const env = quotaEnvironment();
  const key = String(process.env.BREVO_API_KEY ?? "").trim();
  if (!key) {
    const result = await supabase.from("cotas_consultas").upsert({ ambiente: env, servico: "BREVO", status: "SEM_CHAVE", consultado_em: new Date().toISOString() }, { onConflict: "ambiente,servico", ignoreDuplicates: true });
    if (result.error) throw new Error("Não foi possível registrar o estado do monitor de cotas.");
    return;
  }
  let status = "CONSULTA_INDISPONIVEL";
  try {
    const response = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key }, signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      let reading: QuotaReading | undefined;
      try { reading = brevoReading(await response.json()); } catch { status = "PLANO_NAO_SUPORTADO"; }
      if (reading) { await saveReading(reading); status = "OK"; }
    } else status = [401, 403].includes(response.status) ? "SEM_PERMISSAO" : "PROVEDOR_INDISPONIVEL";
  } catch { status = "CONSULTA_INDISPONIVEL"; }
  const { error } = await supabase.from("cotas_consultas").upsert({ ambiente: env, servico: "BREVO", status, consultado_em: new Date().toISOString() });
  if (error) throw new Error("Não foi possível registrar o estado do monitor de cotas.");
}
const SUPABASE_QUOTA = { servico: "SUPABASE", metrica: "banco_bytes", rotulo: "Supabase · banco de dados", unidade: "bytes", automatico: true,
  observacao: "Tamanho atual do banco, consultado no PostgreSQL. Não inclui arquivos do Storage nem tráfego. O limite só é exibido quando confirmado na configuração do plano." };
async function monitorSupabaseQuota() {
  let status = "CONSULTA_INDISPONIVEL";
  try {
    const result = await supabase.rpc("consultar_tamanho_banco_cotas");
    const used = Number(result.data);
    if (result.error || result.data === null || !Number.isSafeInteger(used) || used < 0) throw new Error("SEM_LEITURA");
    const configured = Number(process.env.SUPABASE_DATABASE_LIMIT_BYTES);
    const limit = Number.isSafeInteger(configured) && configured > 0 ? configured : null;
    await saveReading({ servico: "SUPABASE", metrica: "banco_bytes", rotulo: SUPABASE_QUOTA.rotulo, usado: used, limite: limit,
      renovaEm: new Date(Date.now() + 24 * 3600_000).toISOString(), origem: "API_OFICIAL" });
    status = "OK";
  } catch { /* Never substitute an unavailable database reading with zero. */ }
  const result = await supabase.from("cotas_consultas").upsert({ ambiente: quotaEnvironment(), servico: "SUPABASE", status, consultado_em: new Date().toISOString() });
  if (result.error) throw new Error("Não foi possível registrar a consulta Supabase.");
}

let refreshInFlight: Promise<void> | null = null;
let refreshedAt = 0;
export async function refreshServiceQuotasIfStale() {
  if (Date.now() - refreshedAt < 5 * 60_000) return;
  if (!refreshInFlight) refreshInFlight = monitorServiceQuotas().then(() => { refreshedAt = Date.now(); }).finally(() => { refreshInFlight = null; });
  await refreshInFlight;
}
export async function monitorServiceQuotas() {
  const results = await Promise.allSettled([monitorResendQuota(), monitorBrevoQuota(), monitorAzureQuota(), monitorSupabaseQuota()]);
  if (results.some(result => result.status === "rejected")) throw new Error("Uma das consultas de cotas não pôde ser registrada.");
}
async function monitorAzureQuota() {
  const env = quotaEnvironment();
  if (!azureQuotaEnabled(process.env)) return;
  if (!azureQuotaConfig(process.env)) {
    const result = await supabase.from("cotas_consultas").upsert({ ambiente: env, servico: "AZURE", status: "SEM_CONFIGURACAO", consultado_em: new Date().toISOString() });
    if (result.error) throw new Error("Não foi possível registrar o estado do monitor de cotas do Azure.");
    return;
  }
  let status = "CONSULTA_INDISPONIVEL";
  try {
    const readings = await fetchAzureQuotaReadings(process.env);
    for (const reading of readings) await saveReading(reading);
    status = readings.length === AZURE_QUOTA_CATALOG.length ? "OK" : "SEM_DADOS_COMPLETOS";
  } catch (error: any) {
    if (["SEM_CHAVE", "SEM_PERMISSAO", "PLANO_NAO_SUPORTADO", "PROVEDOR_INDISPONIVEL"].includes(error?.message)) status = error.message;
  }
  const result = await supabase.from("cotas_consultas").upsert({ ambiente: env, servico: "AZURE", status, consultado_em: new Date().toISOString() });
  if (result.error) throw new Error("Não foi possível registrar a consulta de cotas do Azure.");
}
export async function listServiceQuotas(includeBrevo = false, includeAzure = false) {
  const env = quotaEnvironment();
  const [readings, checks] = await Promise.all([
    supabase.from("cotas_servicos").select("*").eq("ambiente", env).gt("renova_em", new Date().toISOString()).order("verificado_em", { ascending: false }).limit(100),
    supabase.from("cotas_consultas").select("servico,status,consultado_em").eq("ambiente", env),
  ]);
  if (readings.error || checks.error) throw new Error("Não foi possível consultar as cotas.");
  const catalog = [...QUOTA_CATALOG.filter(item => includeBrevo || item.servico !== "BREVO"), ...(includeAzure ? [...AZURE_QUOTA_CATALOG, SUPABASE_QUOTA] : [])];
  const capmonster = await capmonsterQuota();
  return { ambiente: env, alertas: [80, 90, 100], servicos: [...catalog.map(item => {

    const reading = readings.data?.find(row => row.servico === item.servico && row.metrica === item.metrica);
    const check = checks.data?.find(row => row.servico === item.servico)
      ?? (item.servico === "AZURE" && !azureQuotaConfig(process.env)
        ? { servico: "AZURE", status: "SEM_CONFIGURACAO", consultado_em: new Date().toISOString() }
        : null);
    return { ...item, leitura: reading ? { ...reading, restante: reading.limite === null ? null : Math.max(Number(reading.limite)-Number(reading.usado), 0),
      percentual: reading.limite === null ? null : Number(reading.usado)/Number(reading.limite)*100,
      faixa: quotaBand(Number(reading.usado), reading.limite === null ? null : Number(reading.limite)),
      desatualizada: Date.now()-Date.parse(reading.verificado_em)>6*3600_000 } : null,
      consulta: check };
  }),capmonster] };
}
