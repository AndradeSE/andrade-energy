import { Client } from "pg";
import { neonProductionConnection, snapshotFailureReason, synchronizeNeonProduction } from "../config/neonSnapshotRuntime";
import "dotenv/config";
import { startNeonPrivateApi } from "../config/neonPrivateApi";
import { verifyNeonPrivateDocument } from "../config/neonDocumentProbe";
import { verifyNeonRecovery } from '../config/neonRecoveryProbe';
import { validateRecoverySnapshot } from '../config/neonRecoveryPolicy';

async function main() {
  if (process.env.NEON_API_ENABLED !== "true") return;
  const gate = new Client({ ...neonProductionConnection(process.env), statement_timeout: 120_000 });
  await gate.connect();
  try {
    if (process.env.NEON_STORAGE_SNAPSHOT_ENABLED === "true" && process.env.NEON_RECOVERY_READ_ONLY !== "true") {
      const { rows: [state] } = await gate.query(
        "SELECT mode,captured_at,completed_at,storage_ready,storage_manifest FROM reserve_control.snapshot_state WHERE id=1",
      );
      try {
        validateRecoverySnapshot(state);
      } catch {
        console.log("Atualizando cópia Neon antes da verificação de recuperação.");
        try {
          await synchronizeNeonProduction(process.env);
        } catch (error) {
          console.error("Atualização da cópia Neon falhou:", snapshotFailureReason(error));
          throw error;
        }
      }
    }
  // Do not load a schema while the running collector is replacing replica tables.
  await gate.query("SELECT pg_advisory_lock(7071190)");
  const api = await startNeonPrivateApi(process.env);
  try {
    for (const table of ["clientes", "usinas", "unidades_consumidoras", "contratos", "faturas"]) {
      const result = await api.client.from(table).select("id", { count: "exact", head: true });
      if (result.error) throw new Error("Consulta Neon incompatível");
      console.log("Consulta da API privada Neon validada", { tabela: table, registros: result.count });
    }
    const relation = await api.client.from("unidades_consumidoras").select("id,clientes(id)").limit(1);
    if (relation.error) throw new Error("Relacionamentos Neon incompatíveis");
    const rpc = await api.client.rpc("consultar_tamanho_banco_cotas");
    if (rpc.error) throw new Error("RPC Neon incompatível");
    const anonymous = await fetch(`${api.origin}/clientes?select=id&limit=1`, { signal: AbortSignal.timeout(8000) });
    if (anonymous.ok) throw new Error("API privada aceitou consulta sem autenticação");
    console.log("Relacionamentos, RPC e rejeição de acesso sem autenticação validados no Neon Production.");
    if (process.env.NEON_STORAGE_SNAPSHOT_ENABLED === "true") {
      console.log("PDF privado do Neon validado", await verifyNeonPrivateDocument(process.env));
    }
  } finally { api.stop(); }
  if (process.env.NEON_STORAGE_SNAPSHOT_ENABLED === 'true') {
    console.log('Recuperação autenticada Neon validada', await verifyNeonRecovery(process.env));
    console.log('Troca automática Neon validada', await verifyNeonRecovery(process.env, true));
  }
  } finally {
    await gate.query("SELECT pg_advisory_unlock(7071190)").catch(() => {});
    await gate.end();
  }
}

main().catch(() => { console.error("Conferência da API privada Neon Production falhou."); process.exit(1); });
