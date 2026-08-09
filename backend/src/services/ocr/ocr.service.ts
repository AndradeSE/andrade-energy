import fs from "fs/promises";
import pdfParse from "pdf-parse";

export async function extrairTextoPDF(
  caminhoArquivo: string
): Promise<string> {

  const buffer = await fs.readFile(caminhoArquivo);

  const pdf = await pdfParse(buffer);

  return pdf.text;

}