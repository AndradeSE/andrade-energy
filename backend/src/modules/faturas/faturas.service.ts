import { Request } from "express";

import { buscarFaturaPorId, listarFaturas } from "./faturas.repository";
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

  // OCR
  const texto = await extrairTextoPDF(req.file.path);

  console.log("========== OCR ==========");
  console.log(texto);
  console.log("=========================");

  // Parser
  const dados = interpretarFatura(texto);

  console.log("========== DADOS EXTRAÍDOS ==========");
  console.log(dados);
  console.log("=====================================");

  // Processamento
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
