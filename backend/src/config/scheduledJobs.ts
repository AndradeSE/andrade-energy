import { supabase } from "./supabase";
import { runScheduledJob, type ScheduledJob } from "./durableScheduledJob";
import type { ContingencyExecutor } from './contingencyExecutor';

export async function enfileirarLembretesAutoleitura() {
  const { error } = await supabase.rpc("enfileirar_lembretes_autoleitura");
  if (error) throw error;
}

export const scheduledJobs: Record<ScheduledJob, { interval: number; run: () => Promise<unknown> }> = {
  PUSH: { interval: 60, run: async () => {
    const { processarPushPendente } = await import("../modules/notificacoes/push.service.js");
    for (let n=0;n<10;n++) if (!(await processarPushPendente()).processed) break;
  } },
  COTAS: { interval: 3600, run: async () => (await import("../modules/cotas/cotas.service.js")).monitorServiceQuotas() },
  AVISOS_CONTRATOS: { interval: 3600, run: async () => (await import("../modules/contratos/vencimentoContrato.service.js")).avisarContratosProximosDoVencimento() },
  AVISOS_FATURAS: { interval: 3600, run: async () => {
    const { avisarFaturasProximasDoVencimento } = await import("../modules/faturas/lembreteVencimento.service.js");
    const resultados = await Promise.allSettled([avisarFaturasProximasDoVencimento(), enfileirarLembretesAutoleitura()]);
    for (const resultado of resultados) if (resultado.status === "rejected") throw resultado.reason;
  } },
  RATEIOS: { interval: 60, run: async () => (await import("../modules/usinas/rateioAutomatico.service.js")).processarRateiosAutomaticos() },
  CONVITES: { interval: 60, run: async () => (await import("../modules/comercial/adesaoAssinatura.service.js")).processarConvitesAdesoes() },
  PRODUCAO_EMAIL: { interval: 300, run: async () => (await import("../modules/email/email.service.js")).processarContasDeEnergiaRecebidas() },
  FATURAS_EMAIL: { interval: 60, run: async () => (await import("../modules/recebimento-faturas/recebimentoFaturas.service.js")).processarFilaDeRecebimentosFaturas() },
  NOTIFICACOES_FATURA: { interval: 60, run: async () => (await import("../modules/faturas/notificacoesFatura.service.js")).processarFilaDeNotificacoes() },
};

export async function executeScheduledJob(name: ScheduledJob, executor: ContingencyExecutor) {
  const job=scheduledJobs[name];
  if (!job) throw new Error("Tarefa desconhecida.");
  return runScheduledJob(supabase,name,executor,job.interval,job.run);
}
