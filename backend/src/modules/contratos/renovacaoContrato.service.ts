import { supabase } from "../../config/supabase";
import { criarNotificacaoApp } from "../notificacoes/push.service";
import { contratoLiberaUnidade } from "./acessoContrato.policy";

const estadosAbertos = ["PENDENTE", "PROPOSTA_ENVIADA"];

export async function solicitarRenovacaoContrato(contratoId: string, usuario: any) {
  const { data: contrato, error } = await supabase.from("contratos")
    .select("id,numero,empresa_id,cliente_id,unidade_consumidora_id,status,vigencia_fim,dados_documento,aceite_cliente_em,contrato_assinado_url,clientes(nome),unidades_consumidoras(numero,usina_id)")
    .eq("id", contratoId).maybeSingle();
  if (error) throw error;
  if (!contrato || !contratoLiberaUnidade(contrato)) {
    throw new Error("Somente um contrato vigente e assinado pode ser renovado.");
  }
  const { data: titular, error: erroTitular } = await supabase.from("empresa_usuarios")
    .select("id").eq("usuario_id", usuario.id).eq("empresa_id", contrato.empresa_id)
    .eq("cliente_id", contrato.cliente_id).eq("papel", "LEITURA").eq("ativo", true).maybeSingle();
  if (erroTitular) throw erroTitular;
  if (!titular) throw new Error("Somente o cliente vinculado a este contrato pode pedir a renovação.");
  const { data: cancelamento, error: erroCancelamento } = await supabase.from("solicitacoes_cancelamento_contrato")
    .select("id").eq("contrato_id", contratoId).in("status", ["PENDENTE", "PROCESSANDO"]).limit(1).maybeSingle();
  if (erroCancelamento) throw erroCancelamento;
  if (cancelamento) throw new Error("Há um pedido de cancelamento em análise. Aguarde a resposta antes de pedir renovação.");

  const { data: revisoes, error: erroRevisoes } = await supabase.from("contratos")
    .select("id,dados_documento").eq("unidade_consumidora_id", contrato.unidade_consumidora_id)
    .eq("empresa_id", contrato.empresa_id).eq("status", "RASCUNHO");
  if (erroRevisoes) throw erroRevisoes;
  if ((revisoes ?? []).some((item: any) => item.dados_documento?.contrato_anterior_id === contrato.id
    && item.dados_documento?.envio_email_concluido === true)) {
    throw new Error("Já existe uma proposta de revisão enviada para este contrato.");
  }

  const { data: anterior, error: erroAnterior } = await supabase.from("solicitacoes_renovacao_contrato")
    .select("*").eq("contrato_id", contratoId).in("status", estadosAbertos).maybeSingle();
  if (erroAnterior) throw erroAnterior;
  let solicitacao: any = anterior;
  if (!solicitacao) {
    const insercao = await supabase.from("solicitacoes_renovacao_contrato").insert({
      contrato_id: contratoId,
      empresa_id: contrato.empresa_id,
      cliente_id: contrato.cliente_id,
      solicitado_por: usuario.id,
    }).select().single();
    if (insercao.error?.code === "23505") {
      const recuperada = await supabase.from("solicitacoes_renovacao_contrato")
        .select("*").eq("contrato_id", contratoId).in("status", estadosAbertos).single();
      if (recuperada.error) throw recuperada.error;
      solicitacao = recuperada.data;
    } else {
      if (insercao.error) throw insercao.error;
      solicitacao = insercao.data;
    }
  }
  if (!solicitacao) throw new Error("Não foi possível registrar a solicitação de renovação.");

  const { data: vinculos, error: erroVinculos } = await supabase.from("empresa_usuarios")
    .select("usuario_id,papel,permissoes").eq("empresa_id", contrato.empresa_id).eq("ativo", true)
    .in("papel", ["ADMIN_EMPRESA", "GESTOR", "COLABORADOR_GERADOR"]);
  if (erroVinculos) throw erroVinculos;
  const cliente: any = Array.isArray(contrato.clientes) ? contrato.clientes[0] : contrato.clientes;
  const unidade: any = Array.isArray(contrato.unidades_consumidoras) ? contrato.unidades_consumidoras[0] : contrato.unidades_consumidoras;
  await Promise.all((vinculos ?? []).filter((vinculo: any) =>
    vinculo.papel !== "COLABORADOR_GERADOR" || vinculo.permissoes?.contratos !== false,
  ).map((vinculo: any) => criarNotificacaoApp({
    usuario_id: vinculo.usuario_id,
    empresa_id: contrato.empresa_id,
    cliente_id: contrato.cliente_id,
    usina_id: unidade?.usina_id,
    tipo: "RENOVACAO_CONTRATO_SOLICITADA",
    titulo: "Renovação solicitada",
    detalhe: `${cliente?.nome ?? "Cliente"} pediu a renovação do contrato ${contrato.numero ?? contrato.id}${unidade?.numero ? `, UC ${unidade.numero}` : ""}. Revise as condições e envie a nova versão para aceite.`,
    rota: `/contratos`,
    chave_dedupe: `renovacao:${solicitacao.id}:${vinculo.usuario_id}`,
  }))).catch((erroNotificacao) =>
    console.error("Falha ao notificar solicitação de renovação", erroNotificacao));
  return { solicitacao, message: "Pedido registrado. O gerador vai revisar a proposta e enviá-la para seu aceite no aplicativo." };
}

export async function listarRenovacoesAbertas(empresaId: string, contratosIds: string[]) {
  if (!contratosIds.length) return [];
  const { data, error } = await supabase.from("solicitacoes_renovacao_contrato")
    .select("contrato_id,status,solicitado_em")
    .eq("empresa_id", empresaId).in("contrato_id", contratosIds).in("status", estadosAbertos);
  // Uma implantação do backend antes da migração não pode derrubar a leitura
  // dos contratos existentes. O POST continua falhando até a tabela existir.
  if (error?.code === "42P01" || error?.code === "PGRST205") return [];
  if (error) throw error;
  return data ?? [];
}

export async function marcarPropostaRenovacaoEnviada(contrato: any) {
  const anteriorId = contrato?.dados_documento?.contrato_anterior_id;
  if (!anteriorId) return;
  const { error } = await supabase.from("solicitacoes_renovacao_contrato")
    .update({ status: "PROPOSTA_ENVIADA", proposta_contrato_id: contrato.id, proposta_enviada_em: new Date().toISOString() })
    .eq("contrato_id", anteriorId).eq("empresa_id", contrato.empresa_id).eq("status", "PENDENTE");
  if (error) throw error;
}

export async function marcarPropostaRenovacaoAceita(contrato: any) {
  const anteriorId = contrato?.dados_documento?.contrato_anterior_id;
  if (!anteriorId) return;
  const { error } = await supabase.from("solicitacoes_renovacao_contrato")
    .update({ status: "ACEITA", aceita_em: new Date().toISOString() })
    .eq("contrato_id", anteriorId).eq("proposta_contrato_id", contrato.id)
    .eq("empresa_id", contrato.empresa_id).eq("status", "PROPOSTA_ENVIADA");
  if (error) throw error;
}
