import { Client } from "pg";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { RequestHandler } from "express";
import { startNeonPrivateApi } from "./neonPrivateApi";
import { neonPreviewConnection } from "./neonSnapshotRuntime";
import { neonStorageConnection, reserveDocumentsBucket } from "./neonStorageRuntime";
import { recoveryStorage } from "./neonRecoveryStorage";
import { recoveryReadAllowed, validateRecoverySnapshot } from "./neonRecoveryPolicy";
import { recoveryActive, setRecoveryState } from "./neonRecoveryState";
import { installRecoveryClient } from "./supabase";
import { prepareRecoveryEvents, publishRecoveryTransition } from './neonRecoveryEvents';

let refresh: (() => Promise<void>) | null = null;
export const neonRecoveryGuard: RequestHandler = async (req, res, next) => {
  if (!recoveryActive() || req.path === "/health" || req.method === "OPTIONS") return next();
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Database-Mode", "neon-read-only");
  if (!recoveryReadAllowed(req.method, req.path)) return res.status(503).json({
    code: "RESERVA_SOMENTE_LEITURA", message: "Recuperação de dados em consulta. Alterações e operações automáticas estão bloqueadas.",
  });
  try { await refresh!(); return next(); }
  catch { return res.status(503).json({ code: "RESERVA_DESATUALIZADA", message: "A cópia de recuperação precisa ser atualizada antes da consulta." }); }
};

/** Opt-in Preview-only recovery. No automatic promotion of an asynchronous copy to writer. */
export async function initializeNeonRecovery(env: NodeJS.ProcessEnv, options = { notify: true }) {
  if (env.NEON_RECOVERY_READ_ONLY !== "true") return null;
  if (env.API_RUNTIME === "serverless" || env.API_DISTRIBUTED_RATE_LIMIT === "true" || env.NEON_API_ENABLED !== "true") {
    throw new Error("Recuperação exige Render com API privada e limitador local");
  }
  const config = neonPreviewConnection(env);
  const state = async () => {
    const pg = new Client(config);
    try {
      await pg.connect();
      const { rows: [row] } = await pg.query("SELECT mode,captured_at,completed_at,storage_ready,storage_manifest FROM reserve_control.snapshot_state WHERE id=1");
      const valid = validateRecoverySnapshot(row);
      setRecoveryState(valid);
      return row;
    } finally { await pg.end(); }
  };
  await state();
  const storage = new S3Client(neonStorageConnection(env));
  let api: Awaited<ReturnType<typeof startNeonPrivateApi>>;
  try { api = await startNeonPrivateApi(env); }
  catch (error) { storage.destroy(); setRecoveryState(null); throw error; }
  const files = recoveryStorage(async () => (await state()).storage_manifest,
    key => getSignedUrl(storage, new GetObjectCommand({ Bucket: reserveDocumentsBucket, Key: key }), { expiresIn: 60 }),
    async key => {
      const value = await storage.send(new GetObjectCommand({ Bucket: reserveDocumentsBucket, Key: key }), { abortSignal: AbortSignal.timeout(15_000) });
      if (!value.Body || (value.ContentLength ?? Infinity) > 32 * 1024 * 1024) throw new Error("Documento indisponível");
      return value.Body.transformToByteArray();
    });
  const client = new Proxy(api.client, { get(target, key) {
    if (key === "storage") return files;
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const restore = installRecoveryClient(client);
  refresh = async () => { await state(); };
  if (options.notify) {
    await prepareRecoveryEvents(env);
    await publishRecoveryTransition(env,'NEON').catch(()=>console.warn('Aviso de recuperação exige conferência.'));
  }
  return { stop() { restore(); api.stop(); storage.destroy(); refresh = null; setRecoveryState(null); } };
}
