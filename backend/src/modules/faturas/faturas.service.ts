import { Request } from "express";

import {
  listarFaturas
} from "./faturas.repository";

import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import { processarFatura } from "./processarFatura.service";

export { listarFaturas };

export async function importarFatura(
  req: Request
) {
  if (!req.file)
    throw new Error("Arquivo não enviado.");

  const texto =
    await extrairTextoPDF(req.file.path);

  console.log("========== OCR ==========");
  console.log(texto);
  console.log("=========================");

  const dados =
    interpretarFatura(texto);

  console.log("DADOS EXTRAÍDOS:");
  console.log(dados);

  await processarFatura(dados);

  return {
    sucesso: true,
    dados,
  };
}