import { Request } from "express";

import { buscarFaturaPorId, excluirFaturaPorId, listarFaturas as listarFaturasRepository } from "./faturas.repository";
import { processarFatura } from "./processarFatura.service";

import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import {
  armazenarDocumentosDaFatura,
  incluirLinksTemporarios,
  regenerarDocumentosGeradosDaFatura,
} from "./documentosFatura.service";
import { enfileirarNotificacoesDaFatura } from "./notificacoesFatura.service";
import { criarCobranca } from "../cobrancas/cobrancas.repository";
import { registrarCreditosDaFatura } from "../creditos/consumo.service";
import { supabase } from "../../config/supabase";

export async function listarFaturas(filtro?: { clienteId?: string; uc?: string }) {
  const faturas = await listarFaturasRepository(filtro);
  return Promise.all(faturas.map((fatura) => incluirLinksTemporarios(fatura)));
}

export async function detalharFatura(id: string) {
  const fatura = await buscarFaturaPorId(id);
  if (!fatura) throw new Error("Fatura não encontrada.");

  // PDFs antigos utilizavam nomes fixos. Ao abrir a fatura uma única vez,
  // recriamos os demonstrativos Andrade com o layout atual e um endereço novo,
  // sem tocar no PDF original da concessionária.
  const documentoAntigo = (caminho?: string | null) =>
    /\/fatura-(?:usina|unificada)\.pdf(?:$|\?)/.test(String(caminho ?? ""));
  const precisaAtualizarPdf = documentoAntigo(fatura.pdf_usina_url) || documentoAntigo(fatura.pdf_unificada_url);
  const faturaAtualizada = precisaAtualizarPdf
    ? await regenerarDocumentosGeradosDaFatura(fatura)
    : fatura;

  return incluirLinksTemporarios(faturaAtualizada);
}

export async function excluirFatura(id: string) {
  await excluirFaturaPorId(id);
  return { sucesso: true };
}

export async function regenerarDocumentosFatura(id: string) {
  const fatura = await buscarFaturaPorId(id);
  if (!fatura) throw new Error("Fatura não encontrada.");
  return incluirLinksTemporarios(await regenerarDocumentosGeradosDaFatura(fatura));
}

export async function confirmarFaturaRascunho(id: string) {
  const existente = await buscarFaturaPorId(id);
  if (!existente) throw new Error("Fatura não encontrada.");
  if (String(existente.status ?? "").toUpperCase() !== "RASCUNHO") {
    throw new Error("Somente faturas em rascunho podem ser confirmadas.");
  }

  const { data: fatura, error } = await supabase
    .from("faturas")
    .update({ status: "ABERTA" })
    .eq("id", id)
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
  await enfileirarNotificacoesDaFatura(fatura);
  return incluirLinksTemporarios(fatura);
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
    await armazenarDocumentosDaFatura(resultado, req.file.path);
    await enfileirarNotificacoesDaFatura(resultado);
  }

  return {
    sucesso: true,
    dados,
    resultado,
  };
}
