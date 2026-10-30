import fs from "fs";
import pdf from "pdf-parse";

export async function extrairTexto(caminho: string) {
  const buffer = fs.readFileSync(caminho);

  const resultado = await pdf(buffer);

  return resultado.text;
}