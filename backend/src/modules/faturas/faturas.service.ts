import { Request } from "express";

import { listarFaturas } from "./faturas.repository";
import { processarFatura } from "./processarFatura.service";

import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";

export { listarFaturas };

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

  return {
    sucesso: true,
    dados,
    resultado,
  };
}