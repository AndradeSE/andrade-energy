import { supabase } from "../../config/supabase";
import { empresaIdDoUsuario } from "../../config/empresa";
import { criarConvite } from "../convites/convites.service";
import { obterPropostaParaConvite } from "../convites/propostaConvite.service";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import crypto from "node:crypto";

/** Envia somente a minuta previamente revisada, nunca regenera ao enviar. */
export async function enviarContratoEConvite(unidadeId: string, gestor: any) {
  const empresaId = empresaIdDoUsuario(gestor);
  const { data: unidade, error } = await supabase.from("unidades_consumidoras").select("id,cliente_id")
    .eq("id", unidadeId).eq("empresa_id", empresaId).single();
  if (error || !unidade?.cliente_id) throw new Error("UC não encontrada para este gerador.");
  const { data: contrato, error: erroContrato } = await supabase.from("contratos").select("*")
    .eq("unidade_consumidora_id", unidadeId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (erroContrato) throw erroContrato;
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
  const { data: conta, error: erroConta } = await supabase.from("usuarios").select("id").eq("cliente_id", cliente.id).eq("empresa_id", empresaId).eq("perfil", "LEITURA").limit(1).maybeSingle();
  if (erroConta) throw erroConta;
  let resultado: any;
  if (conta) {
    const enviado = await enviarEmailTransacional({ destinatario: cliente.email, assunto: "Contrato e proposta disponíveis para análise", html: "<p>Seu gerador disponibilizou um contrato e uma proposta para sua unidade. Acesse sua conta no aplicativo Consumidor e abra a área Contrato para analisar os documentos.</p>", anexos: [minuta, { filename: proposta.filename, content: proposta.content }] });
    resultado = { emailEnviado: enviado, contaExistente: true };
  } else {
    resultado = await criarConvite({ nome: cliente.nome, cpf: cliente.cpf, email: cliente.email, whatsapp: cliente.whatsapp || undefined, unidade_consumidora_id: unidadeId }, gestor, { minuta, proposta });
  }
  // Auditoria do arquivo efetivamente selecionado para o envio. O registro é
  // feito mesmo se o provedor de e-mail falhar, distinguindo preparo e entrega.
  const { error: erroAuditoria } = await supabase.from("contratos").update({
    dados_documento: { ...d, envio_documento_hash: documentoHash, envio_solicitado_em: new Date().toISOString(), envio_email_concluido: Boolean(resultado.emailEnviado) },
  }).eq("id", contrato.id).eq("contrato_gerado_url", contrato.contrato_gerado_url);
  if (erroAuditoria) throw erroAuditoria;
  return { ...resultado, contratoId: contrato.id };
}
