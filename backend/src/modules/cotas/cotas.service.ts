import { supabase } from "../../config/supabase";
import { QUOTA_CATALOG, quotaBand, resendReadings, type QuotaReading } from "./cotas.policy";

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
export async function monitorServiceQuotas() {
  const env = quotaEnvironment();
  const key = process.env.RESEND_USAGE_API_KEY || process.env.RESEND_API_KEY;
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
export async function listServiceQuotas() {
  const env = quotaEnvironment();
  const [readings, checks] = await Promise.all([
    supabase.from("cotas_servicos").select("*").eq("ambiente", env).gt("renova_em", new Date().toISOString()).order("verificado_em", { ascending: false }).limit(100),
    supabase.from("cotas_consultas").select("servico,status,consultado_em").eq("ambiente", env),
  ]);
  if (readings.error || checks.error) throw new Error("Não foi possível consultar as cotas.");
  return { ambiente: env, alertas: [80, 90, 100], servicos: QUOTA_CATALOG.map(item => {
    const reading = readings.data?.find(row => row.servico === item.servico && row.metrica === item.metrica);
    const check = checks.data?.find(row => row.servico === item.servico);
    return { ...item, leitura: reading ? { ...reading, restante: reading.limite === null ? null : Math.max(Number(reading.limite)-Number(reading.usado), 0),
      percentual: reading.limite === null ? null : Number(reading.usado)/Number(reading.limite)*100,
      faixa: quotaBand(Number(reading.usado), reading.limite === null ? null : Number(reading.limite)),
      desatualizada: Date.now()-Date.parse(reading.verificado_em)>6*3600_000 } : null,
      consulta: check ?? null };
  }) };
}
