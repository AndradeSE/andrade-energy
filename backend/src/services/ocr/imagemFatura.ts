import { imageSize } from "image-size";
import { createWorker, PSM } from "tesseract.js";
import PDFDocument from "pdfkit";

export function tipoImagemFatura(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  return null;
}

export class ImagemFaturaError extends Error {}

let emProcessamento = false;

/** Mantém a imagem e acrescenta uma camada de texto reconhecido no PDF. */
export async function converterImagemFatura(buffer: Buffer): Promise<Buffer> {
  if (!tipoImagemFatura(buffer)) throw new ImagemFaturaError("Envie uma foto JPG ou PNG válida.");
  const { width, height } = imageSize(buffer);
  if (!width || !height || width * height > 20_000_000) throw new ImagemFaturaError("A foto deve ter até 20 megapixels.");
  if (emProcessamento) throw new ImagemFaturaError("Outra foto está sendo lida. Aguarde e tente novamente.");
  emProcessamento = true;
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let expirou = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const processamento = (async () => {
      const idioma = require("@tesseract.js-data/por");
      worker = await createWorker("por", 1, { langPath: idioma.langPath, gzip: true, cacheMethod: "none" });
      if (expirou) {
        await worker.terminate();
        throw new ImagemFaturaError("Leitura da foto interrompida.");
      }
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
      const { data } = await worker.recognize(buffer, { rotateAuto: true }, { text: true });
      if (data.confidence < 40 || !/CEMIG/i.test(data.text) || data.text.length > 50_000) {
        throw new ImagemFaturaError("Não foi possível ler a fatura. Envie uma foto nítida da página inteira ou o PDF original.");
      }
      const pdf = await new Promise<Buffer>((resolve, reject) => {
        const documento = new PDFDocument({ size: [595, 595 * height / width], margin: 0 });
        const partes: Buffer[] = [];
        documento.on("data", parte => partes.push(parte));
        documento.on("error", reject);
        documento.on("end", () => resolve(Buffer.concat(partes)));
        documento.image(buffer, 0, 0, { width: 595 });
        documento.fillOpacity(0).font("Helvetica").fontSize(1).text(data.text, 1, 1, { width: 593, lineGap: 0 });
        documento.end();
      });
      if (pdf.length > 10 * 1024 * 1024) throw new ImagemFaturaError("A foto convertida ultrapassou 10 MB. Reduza o tamanho da imagem.");
      return pdf;
    })();
    const limite = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expirou = true;
        reject(new ImagemFaturaError("A leitura da foto excedeu 45 segundos. Envie uma imagem menor ou o PDF original."));
      }, 45_000);
    });
    return await Promise.race([processamento, limite]);
  } finally {
    clearTimeout(timer);
    if (worker) await worker.terminate();
    emProcessamento = false;
  }
}
