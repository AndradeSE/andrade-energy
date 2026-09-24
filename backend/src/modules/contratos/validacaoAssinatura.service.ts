import { supabase } from "../../config/supabase";
import crypto from "node:crypto";
import { enviarConviteAposConferencia } from "./envioContrato.service";

/** Validação humana explícita; não se apresenta como verificação criptográfica. */
export async function validarAssinaturaExterna(id: string, usuario: any, confirmado: boolean) {
  if (!confirmado) throw new Error("Confirme que verificou o documento e as assinaturas das partes.");
  const { data: contrato, error } = await supabase.from("contratos").select("*").eq("id", id).single();
  if (error) throw error;
  if (["CANCELADO", "VENCIDO", "SUBSTITUIDO"].includes(String(contrato.status).toUpperCase())) throw new Error("Este contrato não está disponível para validação.");
  if (!contrato.contrato_assinado_url || !contrato.dados_documento?.assinatura_externa_pendente) throw new Error("Não há documento pendente de validação.");
  const { data: pdf, error: erroPdf } = await supabase.storage.from("contratos").download(contrato.contrato_assinado_url);
  if (erroPdf || !pdf) throw new Error("Não foi possível verificar o arquivo anexado.");
  const hash = crypto.createHash("sha256").update(Buffer.from(await pdf.arrayBuffer())).digest("hex");
  const validadoEm = new Date().toISOString();
  const { data: atualizado, error: erroAtualizacao } = await supabase.from("contratos").update({ status: contrato.status === "RASCUNHO" ? "RASCUNHO" : "ATIVO", documento_hash: hash,
    dados_documento: { ...contrato.dados_documento, assinatura_externa_pendente: false, assinatura_externa_validada_em: validadoEm, assinatura_externa_validada_por: usuario.id, assinatura_externa_validacao: "CONFERENCIA_MANUAL_GERADOR", aceite_cliente_exigido: true },
  }).eq("id", id).eq("contrato_assinado_url", contrato.contrato_assinado_url)
    .eq("status", contrato.status).eq("dados_documento", JSON.stringify(contrato.dados_documento)).select("id").maybeSingle();
  if (erroAtualizacao || !atualizado) {
    if (erroAtualizacao) throw erroAtualizacao;
    throw new Error("O contrato mudou durante a validação. Reabra e confira a versão atual.");
  }
  try {
    const convite = await enviarConviteAposConferencia({ ...contrato,
      dados_documento: { ...contrato.dados_documento, assinatura_externa_pendente: false, assinatura_externa_validada_em: validadoEm, aceite_cliente_exigido: true },
    }, usuario);
    return { validado: true, ...convite };
  } catch (erro: any) {
    // A revisão já foi registrada. Informe a falha para que o convite seja
    // reenviado pela ação existente, sem pedir nova validação do PDF.
    return { validado: true, emailEnviado: false, conviteErro: erro?.message ?? "Não foi possível enviar o convite." };
  }
}
