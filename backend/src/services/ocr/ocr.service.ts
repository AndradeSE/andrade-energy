import fs from "fs/promises";
import pdf from "pdf-parse";

export async function extrairTextoPDF(
  caminhoArquivo: string
): Promise<string> {

  const buffer =
    await fs.readFile(caminhoArquivo);

  const resultado =
    await pdf(buffer);

  return resultado.text;

}