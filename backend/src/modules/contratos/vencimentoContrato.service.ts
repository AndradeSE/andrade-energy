import { supabase } from "../../config/supabase";
import { criarNotificacaoApp } from "../notificacoes/push.service";
import { hojeNoBrasil } from "./desligamentoContrato.policy";
import { diasParaVencimento } from "./vencimentoContrato.policy";

let executando = false;
export async function avisarContratosProximosDoVencimento() {
  if (executando) return;
  executando = true;
  try {
    const hoje = hojeNoBrasil();
    const limite = new Date(`${hoje}T12:00:00Z`);
    limite.setUTCDate(limite.getUTCDate() + 30);
    for (let inicio = 0; ; inicio += 200) {
      const { data, error } = await supabase.from("contratos").select("*")
        .in("status", ["ATIVO", "VIGENTE"]).gte("vigencia_fim", hoje)
        .lte("vigencia_fim", limite.toISOString().slice(0, 10)).order("id").range(inicio, inicio + 199);
      if (error) throw error;
      for (const contrato of data ?? []) {
        const dias = diasParaVencimento(contrato, hoje);
        if (dias === null) continue;
        const { data: membros, error: erroMembros } = await supabase.from("empresa_usuarios")
          .select("usuario_id,papel,cliente_id,permissoes").eq("empresa_id", contrato.empresa_id).eq("ativo", true);
        if (erroMembros) throw erroMembros;
        for (const membro of membros ?? []) {
          const consumidor = membro.papel === "LEITURA" && membro.cliente_id === contrato.cliente_id;
          const gerador = ["SUPERADMIN", "ADMIN_EMPRESA", "GESTOR"].includes(membro.papel)
            || (membro.papel === "COLABORADOR_GERADOR" && membro.permissoes?.contratos !== false);
          if (!consumidor && !gerador) continue;
          await criarNotificacaoApp({ usuario_id: membro.usuario_id, empresa_id: contrato.empresa_id,
            cliente_id: contrato.cliente_id, tipo: "CONTRATO_VENCIMENTO_30_DIAS",
            titulo: "Contrato próximo do vencimento",
            detalhe: `O contrato ${contrato.numero ?? contrato.id} vence em ${dias} dia(s), em ${contrato.vigencia_fim}. `
              + (consumidor ? "Deseja renovar? Abra o contrato e informe sua escolha. A nova proposta exigirá seu aceite."
                : "Confira a decisão do cliente sobre renovação e prepare a retirada da UC do rateio/injeção para o vencimento, se não houver renovação aceita."),
            rota: consumidor ? `/contrato?unidadeId=${contrato.unidade_consumidora_id}` : "/contratos",
            chave_dedupe: `vencimento-30:${contrato.id}:${contrato.vigencia_fim}:${membro.usuario_id}` });
        }
      }
      if ((data?.length ?? 0) < 200) break;
    }
  } finally { executando = false; }
}
