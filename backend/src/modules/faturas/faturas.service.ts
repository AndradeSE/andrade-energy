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

export async function listarFaturas(filtro?: { clienteId?: string; uc?: string; empresaId?: string }) {
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
      : valorCobranca <= 0
        ? "Não há valor Andrade a cobrar nesta competência porque nenhuma energia foi compensada."
        : "A cobrança ainda não foi emitida. Abra novamente em alguns instantes ou procure o gestor.",
  });
}

export async function excluirFatura(id: string, empresaId?: string) {
  await excluirFaturaPorId(id, empresaId);
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

  const texto = await extrairTextoPDF(req.file.path);
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

  const texto = await extrairTextoPDF(req.file.path);
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
