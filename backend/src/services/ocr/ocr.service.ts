import fs from "fs/promises";
import pdfParse from "pdf-parse";

type PdfJsPagina = {
  getTextContent: (opcoes?: { normalizeWhitespace?: boolean; disableCombineTextItems?: boolean }) => Promise<{
    items: Array<{ str?: string; transform?: number[] }>;
  }>;
};

type PdfJsDocumento = {
  numPages: number;
  getPage: (numero: number) => Promise<PdfJsPagina>;
  destroy: () => void;
};

function extrairTextoDaPagina(conteudo: { items: Array<{ str?: string; transform?: number[] }> }) {
  let ultimaPosicaoY: number | undefined;
  let texto = "";

  for (const item of conteudo.items) {
    const posicaoY = item.transform?.[5];
    texto += ultimaPosicaoY === undefined || ultimaPosicaoY === posicaoY ? item.str ?? "" : `\n${item.str ?? ""}`;
    ultimaPosicaoY = posicaoY;
  }
  return texto;
}

async function extrairTextoPdfComSenha(buffer: Buffer, senha: string) {
  // O pdf-parse usado pelo projeto não encaminha a senha ao pdf.js. Usamos o
  // mesmo pdf.js interno somente neste caso, mantendo o comportamento atual
  // para PDFs sem proteção.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfJs = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js") as {
    disableWorker?: boolean;
    getDocument: (origem: { data: Buffer; password: string }) => Promise<PdfJsDocumento>;
  };

  pdfJs.disableWorker = true;
  let documento: PdfJsDocumento | undefined;
  try {
    documento = await pdfJs.getDocument({ data: buffer, password: senha });
    const paginas = await Promise.all(
      Array.from({ length: documento.numPages }, async (_, indice) => {
        const pagina = await documento!.getPage(indice + 1);
        const conteudo = await pagina.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
        return extrairTextoDaPagina(conteudo);
      })
    );
    return paginas.join("\n\n");
  } catch (erro: any) {
    const mensagem = String(erro?.message ?? "");
    if (/password|senha/i.test(mensagem)) {
      throw new Error("Não foi possível desbloquear o PDF da concessionária com os quatro primeiros dígitos do CPF cadastrado.");
    }
    throw erro;
  } finally {
    documento?.destroy();
  }
}

export async function extrairTextoPDF(
  caminhoArquivo: string,
  senha?: string
): Promise<string> {

  const buffer = await fs.readFile(caminhoArquivo);

  return extrairTextoDoBuffer(buffer, senha);
}

/** Lê a conta original já armazenada sem precisar gravá-la novamente em disco. */
export async function extrairTextoDoBuffer(
  buffer: Buffer,
  senha?: string
): Promise<string> {

  if (senha) return extrairTextoPdfComSenha(buffer, senha);

  const pdf = await pdfParse(buffer);

  return pdf.text;

}
