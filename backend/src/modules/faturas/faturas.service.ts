import { Request } from "express";

import { buscarFaturaPorId, excluirFaturaPorId, listarFaturas } from "./faturas.repository";
import { processarFatura } from "./processarFatura.service";

import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import {
  armazenarDocumentosDaFatura,
  incluirLinksTemporarios,
} from "./documentosFatura.service";
import { enfileirarNotificacoesDaFatura } from "./notificacoesFatura.service";

export { listarFaturas };

export async function detalharFatura(id: string) {
  const fatura = await buscarFaturaPorId(id);
  if (!fatura) throw new Error("Fatura não encontrada.");
  return incluirLinksTemporarios(fatura);
}

export async function excluirFatura(id: string) {
  await excluirFaturaPorId(id);
  return { sucesso: true };
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
