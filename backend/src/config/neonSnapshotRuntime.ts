import { Client } from "pg";
import { productionSupabaseUrl, restoreReserveSnapshot, type ReserveSnapshot } from "./neonSnapshot";
import { mirrorNeonDocuments } from "./neonStorageRuntime";

export function snapshotFailureReason(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safe = ["Origem diferente do Production", "Destino diferente do banco isolado Neon Production",
    "Chave do Production ausente", "Exportação do snapshot recusada", "Reserva não está em modo standby",
    "Snapshot anterior ao já publicado", "Estrutura do reserva desatualizada", "Rotinas do reserva divergentes",
    "Contagem restaurada divergente", "Snapshot vencido", "Snapshot depende do Supabase Auth",
    "Armazenamento Neon Production não configurado", "Manifesto de arquivos inválido",
    "Arquivo de origem indisponível", "Arquivo mudou após o snapshot", "Arquivo mudou durante a cópia",
    "Arquivo do reserva não confere", "Arquivo do reserva indisponível"];
  if (safe.includes(message)) return message;
  const code = (error as { code?: string })?.code;
  if (code && ["28P01", "42501", "23503", "23505", "42P01", "57014", "55P03", "ENOTFOUND", "ETIMEDOUT"].includes(code)) return code;
  return "conexão ou consulta não concluída";
}

export function neonProductionConnection(env: NodeJS.ProcessEnv) {
  if (env.SUPABASE_URL?.replace(/\/$/, "") !== productionSupabaseUrl) throw new Error("Origem diferente do Production");
  const url = new URL(String(env.NEON_DATABASE_URL ?? "").trim());
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !/^ep-cold-voice-berwue3b(?:-pooler)?\.c-9\.us-east-2\.aws\.neon\.tech$/.test(url.hostname) ||
      (url.port && url.port !== "5432") || !/^\/andrade_production_restore_[a-z0-9_]+$/.test(url.pathname) ||
      !url.username || !url.password) throw new Error("Destino diferente do banco isolado Neon Production");
  return {
    host: url.hostname, port: 5432, database: url.pathname.slice(1),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: url.hostname },
    connectionTimeoutMillis: 8000, statement_timeout: 60_000,
  };
}

async function loadSnapshot(env: NodeJS.ProcessEnv): Promise<ReserveSnapshot> {
  if (!env.SUPABASE_SERVICE_KEY) throw new Error("Chave do Production ausente");
  const response = await fetch(`${productionSupabaseUrl}/rest/v1/rpc/exportar_snapshot_reserva_production`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json" },
    body: "{}", signal: AbortSignal.timeout(60_000), redirect: "error",
  });
  if (!response.ok) throw new Error("Exportação do snapshot recusada");
  return await response.json() as ReserveSnapshot;
}

export async function synchronizeNeonProduction(env: NodeJS.ProcessEnv) {
  if (env.NEON_RECOVERY_READ_ONLY === "true") throw new Error("Reserva não está em modo standby");
  const client = new Client(neonProductionConnection(env));
  try {
    await client.connect();
    return await restoreReserveSnapshot(client, () => loadSnapshot(env),
      env.NEON_STORAGE_SNAPSHOT_ENABLED === "true"
        ? (snapshot, previous) => mirrorNeonDocuments(env, snapshot.objects, previous) : undefined);
  } finally {
    await client.end();
  }
}

export function startNeonProductionSnapshots(env: NodeJS.ProcessEnv) {
  if (env.NEON_SNAPSHOT_ENABLED !== "true" || env.API_RUNTIME === "serverless") return;
  // Validate before scheduling. A configuration error must not open another database.
  try { neonProductionConnection(env); }
  catch { console.error("Configuração do snapshot Neon Production inválida."); return; }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await synchronizeNeonProduction(env);
      if (!result.skipped) console.log("Snapshot Neon Production atualizado", result);
    } catch (error) {
      console.error("Snapshot Neon Production não atualizado:", snapshotFailureReason(error));
    } finally { running = false; }
  };
  void tick();
  return setInterval(() => void tick(), 15 * 60_000).unref();
}
