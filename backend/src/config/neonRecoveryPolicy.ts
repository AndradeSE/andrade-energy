/** Recovery serves a bounded set of audited reads, never arbitrary GET handlers. */
const id = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const reads = [
  /^\/api\/auth\/session\/?$/,
  /^\/api\/reserva-dados\/status\/?$/,
  /^\/api\/clientes\/?$/,
  /^\/api\/clientes\/(unidades|minhas-unidades)\/?$/,
  new RegExp(`^/api/clientes/${id}(/unidades)?/?$`, "i"),
  new RegExp(`^/api/clientes/unidade/${id}/?$`, "i"),
  /^\/api\/usinas\/?$/,
  new RegExp(`^/api/usinas/${id}/?$`, "i"),
  /^\/api\/contratos\/?$/,
  new RegExp(`^/api/contratos/${id}/documento/?$`, "i"),
];
export const recoveryMaxAgeMs = 20 * 60_000;
export function recoveryReadAllowed(method: string, path: string) {
  return ["GET", "HEAD"].includes(method) && reads.some(pattern => pattern.test(path));
}
export function validateRecoverySnapshot(state: any, now = Date.now()) {
  const captured = new Date(state?.captured_at).getTime();
  const completed = new Date(state?.completed_at).getTime();
  if (state?.mode !== "standby" || state?.storage_ready !== true || !Array.isArray(state?.storage_manifest) ||
      !Number.isFinite(captured) || !Number.isFinite(completed) || completed < captured ||
      captured > now + 30_000 || now - captured > recoveryMaxAgeMs) {
    throw new Error("Cópia de recuperação indisponível ou desatualizada");
  }
  return { capturedAt: new Date(captured).toISOString(), completedAt: new Date(completed).toISOString() };
}
