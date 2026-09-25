import { Request } from "express";

import { buscarFaturaPorId, excluirFaturaPorId, listarFaturas as listarFaturasRepository } from "./faturas.repository";
import { processarFatura } from "./processarFatura.service";

import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import {
  armazenarDocumentosDaFatura,
  incluirLinksTemporarios,
  obterRelatorioCalculoDaFatura,
  regenerarDocumentosGeradosDaFatura,
  VERSAO_LAYOUT_FATURA,
} from "./documentosFatura.service";
import { enfileirarNotificacoesDaFatura } from "./notificacoesFatura.service";
import { criarCobranca } from "../cobrancas/cobrancas.repository";
import { registrarCreditosDaFatura } from "../creditos/consumo.service";
import { supabase } from "../../config/supabase";
import { tentarCriarCobrancaAsaas } from "../asaas/asaas.service";
import { asaasRequest } from "../asaas/asaas.client";
import { cobrancaAsaasPodeSerExcluida } from "./exclusaoFatura.policy";
import { exigirContratoAssinadoDaUc } from "../contratos/contratoUc.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";

function erroDeSenhaPdf(erro: unknown) {
  return /pdf.*(protegido|senha)|senha.*pdf/i.test(String((erro as any)?.message ?? ""));
}

async function senhasConhecidasDaEmpresa(req: Request) {
  const empresaId = empresaIdDaRequisicao(req);
  const [{ data: unidades, error: erroUnidades }, { data: clientes, error: erroClientes }] = await Promise.all([
    supabase.from("unidades_consumidoras").select("cpf_titular").eq("empresa_id", empresaId),
    supabase.from("clientes").select("cpf").eq("empresa_id", empresaId),
  ]);
  if (erroUnidades) throw erroUnidades;
  if (erroClientes) throw erroClientes;

  return [...new Set([...(unidades ?? []).map((item: any) => item.cpf_titular), ...(clientes ?? []).map((item: any) => item.cpf)]
    .map((documento) => String(documento ?? "").replace(/\D/g, "").slice(0, 4))
    .filter((senha) => senha.length === 4))];
}

async function extrairTextoDaFatura(req: Request) {
  const senhaInformada = String(req.body?.senhaPdf ?? req.body?.senha_pdf ?? "").trim();
  if (senhaInformada) return extrairTextoPDF(req.file!.path, senhaInformada);

  try {
    return await extrairTextoPDF(req.file!.path);
  } catch (erro) {
    if (!erroDeSenhaPdf(erro)) throw erro;
  }

  for (const senha of await senhasConhecidasDaEmpresa(req)) {
    try {
      return await extrairTextoPDF(req.file!.path, senha);
    } catch (erro) {
      if (!erroDeSenhaPdf(erro)) throw erro;
    }
  }

  throw new Error("Este PDF é protegido e não corresponde aos CPFs já cadastrados. Informe os 4 primeiros números do CPF do titular da UC.");
}

export async function listarFaturas(filtro?: { clienteId?: string; uc?: string; empresaId?: string; usinaId?: string }) {
  const faturas = await listarFaturasRepository(filtro);
  return Promise.all(faturas.map((fatura) => incluirLinksTemporarios(fatura)));
}

export async function detalharFatura(id: string, empresaId?: string) {
  let fatura = await buscarFaturaPorId(id, empresaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  let pagamentoAtualizado = false;
  const status = String(fatura.status ?? "").toUpperCase();
  const valorCobranca = Number(fatura.valor_total_unificado ?? fatura.valor_total ?? 0);
  const semDadosPagamento = !fatura.codigo_pix || !fatura.linha_digitavel;
  // Ao abrir uma fatura válida, tenta completar automaticamente os dados
  // assíncronos do Asaas. Assim o cliente não depende de regeneração manual
  // para receber QR Pix e código de barras no documento.
  if (!['RASCUNHO', 'CADASTRO', 'ANEXADA'].includes(status) && valorCobranca > 0 && semDadosPagamento) {
    const cobranca = await tentarCriarCobrancaAsaas(fatura.id, empresaId);
    if (cobranca) {
      fatura = await buscarFaturaPorId(id, empresaId) ?? fatura;
      pagamentoAtualizado = true;
    }
  }
  // Atualiza uma única vez documentos salvos por versões antigas. Assim o
  // consumidor recebe o layout vigente sem depender de um botão do gerador.
  if (pagamentoAtualizado || !String(fatura.pdf_unificada_url ?? "").includes(VERSAO_LAYOUT_FATURA)) {
    fatura = await regenerarDocumentosGeradosDaFatura(fatura);
  }
  const temCobrancaPronta = Boolean(fatura.codigo_pix || fatura.linha_digitavel || fatura.pdf_boleto_url);
  return incluirLinksTemporarios({
    ...fatura,
    cobranca_status: temCobrancaPronta ? "PRONTA" : "PENDENTE",
    cobranca_mensagem: temCobrancaPronta
      ? null
      : fatura.cobranca_erro
        ? String(fatura.cobranca_erro)
      : valorCobranca <= 0
        ? "Não há valor Andrade a cobrar nesta competência porque nenhuma energia foi compensada."
        : "A cobrança ainda não foi emitida. Abra novamente em alguns instantes ou procure o gestor.",
  });
}

export async function excluirFatura(id: string, empresaId?: string) {
  const fatura = await buscarFaturaPorId(id, empresaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  if (["PAGO", "PAGA", "RECEBIDO"].includes(String(fatura.status ?? "").toUpperCase())) {
    throw new Error("Esta fatura já foi paga. Não é possível apagá-la; confira a conciliação antes de qualquer estorno.");
  }
  const empresa = String(fatura.empresa_id);
  const { data: local, error: erroLocal } = await supabase.from("asaas_cobrancas")
    .select("id,asaas_payment_id,status")
    .eq("fatura_id", id).eq("empresa_id", empresa).maybeSingle();
  if (erroLocal) throw erroLocal;
  if (local?.id) {
    const { data: transferencias, error: erroTransferencias } = await supabase.from("asaas_transferencias")
      .select("id").eq("cobranca_id", local.id).limit(1);
    if (erroTransferencias) throw erroTransferencias;
    if (transferencias?.length) throw new Error("Há repasse vinculado a esta cobrança. Concilie o financeiro antes de excluir a fatura.");
  }
  const { data: cobrancasLocais, error: erroCobrancas } = await supabase.from("cobrancas")
    .select("status,pago_em").eq("fatura_id", id).eq("empresa_id", empresa);
  if (erroCobrancas) throw erroCobrancas;
  if (cobrancasLocais?.some((cobranca) => cobranca.pago_em || ["PAGO", "PAGA", "RECEBIDO"].includes(String(cobranca.status ?? "").toUpperCase()))) {
    throw new Error("Existe uma cobrança já paga para esta fatura. Ela não pode ser apagada.");
  }
  if (!process.env.ASAAS_API_KEY) {
    throw new Error("Não foi possível conferir a cobrança no Asaas. A fatura não foi apagada.");
  }
  // A cobrança pode ter sido criada remotamente antes de o vínculo local ser
  // salvo. A referência externa impede que esse boleto fique órfão.
  const remotas = await asaasRequest<{ data?: Array<{ id?: string; deleted?: boolean }> }>(
    `/payments?externalReference=${encodeURIComponent(id)}&limit=100`,
  );
  const ids = new Set<string>();
  for (const pagamento of remotas.data ?? []) {
    if (pagamento.id && pagamento.deleted !== true) ids.add(pagamento.id);
  }
  if (local?.asaas_payment_id) ids.add(String(local.asaas_payment_id));
  const cancelaveis: string[] = [];
  for (const pagamentoId of ids) {
    const pagamento = await asaasRequest<{ id: string; status?: string; deleted?: boolean }>(`/payments/${pagamentoId}`);
    if (pagamento.deleted === true) continue;
    if (!cobrancaAsaasPodeSerExcluida(pagamento.status)) {
      throw new Error("A cobrança no Asaas não está pendente ou vencida. A fatura foi preservada para conferência financeira.");
    }
    cancelaveis.push(pagamentoId);
  }
  for (const pagamentoId of cancelaveis) {
    const cancelado = await asaasRequest<{ deleted?: boolean }>(`/payments/${pagamentoId}`, { method: "DELETE" });
    if (cancelado.deleted !== true) throw new Error("O Asaas não confirmou o cancelamento. A fatura foi preservada.");
  }
  await excluirFaturaPorId(id, empresa);
  return { sucesso: true };
}

export async function regenerarDocumentosFatura(id: string, empresaId?: string) {
  const fatura = await buscarFaturaPorId(id, empresaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  return incluirLinksTemporarios(await regenerarDocumentosGeradosDaFatura(fatura));
}

export async function confirmarFaturaRascunho(id: string, empresaId?: string) {
  const existente = await buscarFaturaPorId(id, empresaId);
  if (!existente) throw new Error("Fatura não encontrada.");
  if (String(existente.status ?? "").toUpperCase() !== "RASCUNHO") {
    throw new Error("Somente faturas em rascunho podem ser confirmadas.");
  }
  if (!existente.unidade_consumidora_id) throw new Error("A fatura não está vinculada a uma UC.");
  await exigirContratoAssinadoDaUc(existente.unidade_consumidora_id, empresaId);

  const { data: fatura, error } = await supabase
    .from("faturas")
    .update({ status: "ABERTA" })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .eq("status", "RASCUNHO")
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!fatura) throw new Error("Esta fatura já foi confirmada ou alterada.");

  if (String(fatura.modalidade_faturamento ?? "").toUpperCase() === "COMPENSACAO" && Number(fatura.energia_compensada ?? 0) > 0) {
    await registrarCreditosDaFatura({
      clienteId: fatura.cliente_id,
      usinaId: fatura.usina_id,
      faturaId: fatura.id,
      competencia: fatura.referencia,
      energiaInjetada: Number(fatura.energia_injetada ?? 0),
      energiaCompensada: Number(fatura.energia_compensada ?? 0),
      saldoAtual: Number(fatura.saldo_atual ?? 0),
    });
  }

  await criarCobranca({
    clienteId: fatura.cliente_id,
    faturaId: fatura.id,
    valor: Number(fatura.valor_total_unificado ?? fatura.valor_total ?? 0),
    vencimento: fatura.vencimento,
  });
  await tentarCriarCobrancaAsaas(fatura.id, empresaId);
  await enfileirarNotificacoesDaFatura(fatura);
  const atualizada = await buscarFaturaPorId(fatura.id);
  return incluirLinksTemporarios(atualizada ?? fatura);
}

export async function obterRelatorioCalculoFatura(id: string, empresaId?: string) {
  const fatura = await buscarFaturaPorId(id, empresaId);
  if (!fatura) throw new Error("Fatura não encontrada.");
  return { url: await obterRelatorioCalculoDaFatura(fatura) };
}

export async function analisarFatura(req: Request) {
  if (!req.file) {
    throw new Error("Arquivo não enviado.");
  }

  const texto = await extrairTextoDaFatura(req);
  const dados = interpretarFatura(texto);

  return {
    dados,
    classificacao:
      Number(dados.energiaInjetada) > 0 ? "POSSIVEL_GERADORA" : "CONSUMIDORA",
    camposPendentes: {
      cliente: ["email", "whatsapp", "cpf", ...(dados.endereco ? [] : ["endereco"])],
      usina: ["potencia_kwp", ...(dados.endereco ? [] : ["endereco"])],
      unidadeConsumidora: ["tipo", "modalidade_faturamento", "desconto_percentual"],
    },
  };
}

export async function importarFatura(
  req: Request
) {
  if (!req.file) {
    throw new Error("Arquivo não enviado.");
  }

  const texto = await extrairTextoDaFatura(req);
  const dados = interpretarFatura(texto);
  const resultado = await processarFatura(dados);

  if (!resultado.clienteNaoEncontrado && !resultado.jaProcessada) {
    // A cobrança é criada dentro de processarFatura e pode acrescentar PIX,
    // linha digitável e boleto. Releia antes de emitir os PDFs para não
    // sobrescrever o documento completo com o objeto anterior à cobrança.
    const atualizadaComPagamento = await buscarFaturaPorId(resultado.id, resultado.empresa_id);
    const faturaFinal = atualizadaComPagamento ?? resultado;
    await armazenarDocumentosDaFatura(faturaFinal, req.file.path);
    await enfileirarNotificacoesDaFatura(faturaFinal);
  }

  return {
    sucesso: true,
    dados,
    resultado,
  };
}
