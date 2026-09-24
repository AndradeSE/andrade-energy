import { supabase } from "../../config/supabase";
import { empresaIdDoUsuario } from "../../config/empresa";
import { criarConvite } from "../convites/convites.service";
import { obterPropostaParaConvite } from "../convites/propostaConvite.service";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import crypto from "node:crypto";
import { criarNotificacaoApp } from "../notificacoes/push.service";

/** Envia somente a minuta previamente revisada, nunca regenera ao enviar. */
export async function enviarContratoEConvite(unidadeId: string, gestor: any, forcarNovoConvite = false) {
  const empresaId = empresaIdDoUsuario(gestor);
  const { data: unidade, error } = await supabase.from("unidades_consumidoras").select("id,cliente_id")
    .eq("id", unidadeId).eq("empresa_id", empresaId).single();
  if (error || !unidade?.cliente_id) throw new Error("UC não encontrada para este gerador.");
  const { data: contrato, error: erroContrato } = await supabase.from("contratos").select("*")
    .eq("unidade_consumidora_id", unidadeId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (erroContrato) throw erroContrato;
  if (contrato?.contrato_assinado_url && contrato.dados_documento?.assinatura_externa_validada_em) {
    return enviarConviteAposConferencia(contrato, gestor);
  }
  if (!contrato?.contrato_gerado_url || contrato.aceite_cliente_em || contrato.contrato_assinado_url) throw new Error("Gere e revise uma minuta não assinada antes de enviar.");
  const d = contrato.dados_documento ?? {};
  if (!d.locador_nome || !d.locador_documento || !d.locador_endereco) throw new Error("Complete os dados do locador antes de enviar.");
  const { data: cliente, error: erroCliente } = await supabase.from("clientes").select("*").eq("id", unidade.cliente_id).eq("empresa_id", empresaId).single();
  if (erroCliente) throw erroCliente;
  const proposta = await obterPropostaParaConvite(cliente.id, empresaId, unidadeId);
  if (!proposta) throw new Error("Não foi possível preparar a proposta desta UC. Nenhum convite foi enviado.");
  const { data: pdf, error: erroPdf } = await supabase.storage.from("contratos").download(contrato.contrato_gerado_url);
  if (erroPdf || !pdf) throw new Error("Não foi possível obter a minuta revisada. Gere o documento novamente.");
  const minuta = { filename: "contrato-para-assinatura.pdf", content: Buffer.from(await pdf.arrayBuffer()) };
  const documentoHash = crypto.createHash("sha256").update(minuta.content).digest("hex");
  const { data: acessoAtivo, error: erroConta } = await supabase.from("empresa_usuarios").select("id")
    .eq("cliente_id", cliente.id).eq("empresa_id", empresaId).eq("papel", "LEITURA").eq("ativo", true).limit(1).maybeSingle();
  if (erroConta) throw erroConta;
  const { data: conviteAnterior, error: erroConviteAnterior } = await supabase.from("convites_clientes")
    .select("id,status")
    .eq("cliente_id", cliente.id)
    .eq("empresa_id", empresaId)
    .order("expira_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroConviteAnterior) throw erroConviteAnterior;
  let resultado: any;
  if (acessoAtivo && !forcarNovoConvite) {
    const revisao = Boolean(d.contrato_anterior_id);
    const enviado = await enviarEmailTransacional({ empresaId: gestor.empresa_id, destinatario: cliente.email, assunto: revisao ? "Revisão contratual disponível para seu aceite" : "Contrato e proposta disponíveis para análise", html: revisao
      ? "<p>Seu gerador enviou uma revisão das condições da sua unidade. O contrato anterior continua preservado. Acesse a área Contrato no aplicativo Consumidor, leia a nova minuta anexa e confirme se concorda com as alterações. O aceite será confirmado por um código enviado ao seu e-mail.</p>"
      : "<p>Seu gerador disponibilizou um contrato e uma proposta para sua unidade. Acesse sua conta no aplicativo Consumidor e abra a área Contrato para analisar os documentos.</p>", anexos: [minuta, { filename: proposta.filename, content: proposta.content }] });
    resultado = { emailEnviado: enviado, contaExistente: true, conviteExistente: Boolean(conviteAnterior), novoConvite: false };
  } else {
    // Um reenvio sempre invalida os códigos pendentes anteriores e produz um
    // token novo. O contrato e a proposta existentes são apenas anexados; não
    // há regeneração de minuta.
    const { error: erroCancelamento } = await supabase.from("convites_clientes")
      .update({ status: "CANCELADO" })
      .eq("empresa_id", empresaId).eq("unidade_consumidora_id", unidadeId).eq("status", "PENDENTE");
    if (erroCancelamento) throw erroCancelamento;
    resultado = await criarConvite({ nome: cliente.nome, cpf: cliente.cpf, email: cliente.email, whatsapp: cliente.whatsapp || undefined, unidade_consumidora_id: unidadeId }, gestor, { minuta, proposta });
    resultado = { ...resultado, novoConvite: true };
  }
  // Auditoria do arquivo efetivamente selecionado para o envio. O registro é
  // feito mesmo se o provedor de e-mail falhar, distinguindo preparo e entrega.
  const { error: erroAuditoria } = await supabase.from("contratos").update({
    dados_documento: { ...d, envio_documento_hash: documentoHash, envio_solicitado_em: new Date().toISOString(), envio_email_concluido: Boolean(resultado.emailEnviado) },
  }).eq("id", contrato.id).eq("contrato_gerado_url", contrato.contrato_gerado_url);
  if (erroAuditoria) throw erroAuditoria;
  return { ...resultado, contratoId: contrato.id };
}

/** Envia acesso após a conferência do PDF externo, sem solicitar nova assinatura. */
export async function enviarConviteAposConferencia(contrato: any, gestor: any) {
  if (!contrato?.contrato_assinado_url || !contrato.dados_documento?.assinatura_externa_validada_em) {
    throw new Error("Confira o PDF assinado antes de enviar o convite de acesso.");
  }
  const empresaId = empresaIdDoUsuario(gestor);
  if (contrato.empresa_id !== empresaId) throw new Error("Contrato não pertence a esta empresa.");
  const { data: acessoAtivo, error: erroAcesso } = await supabase.from("empresa_usuarios")
    .select("id").eq("cliente_id", contrato.cliente_id).eq("empresa_id", empresaId)
    .eq("papel", "LEITURA").eq("ativo", true).limit(1).maybeSingle();
  if (erroAcesso) throw erroAcesso;
  const { data: cliente, error: erroCliente } = await supabase.from("clientes").select("*")
    .eq("id", contrato.cliente_id).eq("empresa_id", empresaId).single();
  if (erroCliente) throw erroCliente;
  const { data: pdf, error: erroPdf } = await supabase.storage.from("contratos").download(contrato.contrato_assinado_url);
  if (erroPdf || !pdf) throw new Error("Não foi possível anexar o contrato assinado ao convite.");
  const assinado = { filename: "contrato-assinado.pdf", content: Buffer.from(await pdf.arrayBuffer()) };
  if (acessoAtivo) {
    const emailEnviado = await enviarEmailTransacional({
      empresaId,
      destinatario: cliente.email,
      assunto: "Contrato assinado disponível para seu aceite",
      html: "<p>Seu gerador conferiu o contrato assinado da sua unidade. Acesse a área Contrato no aplicativo Consumidor, leia o documento e confirme seu aceite com o código enviado ao seu e-mail. Não é necessário assinar novamente.</p>",
      anexos: [assinado],
    });
    return { emailEnviado, contaExistente: true, acessoExistente: true, novoConvite: false };
  }
  const { error: erroCancelamento } = await supabase.from("convites_clientes")
    .update({ status: "CANCELADO" })
    .eq("empresa_id", empresaId).eq("unidade_consumidora_id", contrato.unidade_consumidora_id).eq("status", "PENDENTE");
  if (erroCancelamento) throw erroCancelamento;
  const resultado = await criarConvite({
    nome: cliente.nome, cpf: cliente.cpf, email: cliente.email, whatsapp: cliente.whatsapp || undefined,
    unidade_consumidora_id: contrato.unidade_consumidora_id,
  }, gestor, { assinado });
  return { ...resultado, novoConvite: true, acessoExistente: false };
}

export async function solicitarReenvioConviteCliente(emailInformado: unknown) {
  const email = String(emailInformado ?? "").trim().toLowerCase();
  const resposta = { message: "Se houver um convite pendente para este e-mail, enviaremos um novo link.", emailEnviado: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta;
  const { data: convite } = await supabase.from("convites_clientes")
    .select("unidade_consumidora_id,gestor_id,status")
    .ilike("email", email).eq("status", "PENDENTE")
    .not("unidade_consumidora_id", "is", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!convite?.unidade_consumidora_id || !convite.gestor_id) return resposta;
  const { data: gestor } = await supabase.from("usuarios").select("*").eq("id", convite.gestor_id).maybeSingle();
  if (!gestor) return resposta;
  const { data: unidade } = await supabase.from("unidades_consumidoras").select("numero,cliente_id,clientes(nome)").eq("id", convite.unidade_consumidora_id).maybeSingle();
  const cliente: any = Array.isArray(unidade?.clientes) ? unidade?.clientes[0] : unidade?.clientes;
  await criarNotificacaoApp({
    usuario_id: convite.gestor_id,
    empresa_id: gestor.empresa_id,
    tipo: "REENVIO_CONVITE_SOLICITADO",
    titulo: "Cliente solicitou novo convite",
    detalhe: `${cliente?.nome ?? email} solicitou o reenvio do convite${unidade?.numero ? ` da UC ${unidade.numero}` : ""}.`,
    rota: unidade?.cliente_id ? `/clientes/${unidade.cliente_id}?area=unidades` : "/clientes",
  });
  const resultado = await enviarContratoEConvite(String(convite.unidade_consumidora_id), gestor, true);
  return { ...resposta, emailEnviado: Boolean(resultado.emailEnviado) };
}
