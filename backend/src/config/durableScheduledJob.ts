import { randomUUID } from "node:crypto";
import { contingencyCommit, type ContingencyExecutor } from './contingencyExecutor';

export type ScheduledJob = "PUSH" | "COTAS" | "AVISOS_CONTRATOS" | "AVISOS_FATURAS" |
  "RATEIOS" | "CONVITES" | "PRODUCAO_EMAIL" | "FATURAS_EMAIL" | "NOTIFICACOES_FATURA";

type Store = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };

/** No retry of uncertain business effects. An interrupted run requires reconciliation. */
export async function runScheduledJob(store: Store, name: ScheduledJob, executor: ContingencyExecutor,
  intervalSeconds: number, action: () => Promise<unknown>) {
  const owner = randomUUID();
  const claim = await store.rpc("reservar_trabalho_contingencia", {
    p_nome: name, p_executor: executor, p_dono: owner, p_intervalo: intervalSeconds, p_commit: contingencyCommit(process.env),
  });
  if (claim.error) throw new Error("Não foi possível reservar a tarefa.");
  if (claim.data !== true) return { executed: false };
  let success = false;
  try { await action(); success = true; }
  finally {
    const finish = await store.rpc("finalizar_trabalho_contingencia", { p_nome: name, p_dono: owner, p_sucesso: success });
    if (finish.error || finish.data !== true) throw new Error("Resultado da tarefa exige conferência.");
  }
  return { executed: true };
}
