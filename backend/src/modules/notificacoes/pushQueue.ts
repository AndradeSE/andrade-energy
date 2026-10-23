import { randomUUID } from "node:crypto";

type Db = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }> };

/** One bounded delivery per invocation; records survive cold starts and retries. */
export async function deliverQueuedPush(db: Db, send: (notification: any) => Promise<void>, notificationId?: string) {
  const owner = randomUUID();
  const { data, error } = await db.rpc("reservar_push_contingencia", {
    p_dono: owner, p_notificacao: notificationId ?? null,
  });
  if (error) throw new Error("Não foi possível reservar o push pendente.");
  const job = data?.[0];
  if (!job) return { processed: false };
  let success = false;
  try {
    await send({ ...job.notificacao, ...job.contexto });
    success = true;
  } catch { console.warn("Push mantido na fila para nova tentativa."); }
  const { error: finishError } = await db.rpc("finalizar_push_contingencia", {
    p_notificacao: job.notificacao_id, p_dono: owner, p_sucesso: success,
  });
  if (finishError) throw new Error("Não foi possível registrar o resultado do push.");
  return { processed: true, success };
}
