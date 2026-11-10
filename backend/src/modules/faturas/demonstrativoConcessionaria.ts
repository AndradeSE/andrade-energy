import PDFDocument from "pdfkit";
import { createHash } from "node:crypto";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { PNG } from "pngjs";

export function deveGerarDemonstrativoConcessionaria(fatura: any, consumidor: boolean) {
  return consumidor && fatura.fatura_somente_andrade !== true && Boolean(fatura.pdf_cemig_url);
}
export function chaveDemonstrativoConcessionaria(fatura: any) {
  return createHash("sha256").update(JSON.stringify([fatura.pdf_cemig_url, fatura.updated_at ?? fatura.atualizado_em, fatura.referencia])).digest("hex").slice(0, 24);
}

/** PDFium C API, pinned wrapper 3.0.0. Geometry is in original PDF points. */
function inicioPagamento(page: any, altura: number, numeroUc?: unknown): number | null {
  const api = page.module;
  if (!api?._FPDFText_GetCharBox || !api?._FPDFText_GetUnicode) throw new Error("Geometria do PDF indisponível.");
  const textPage = api._FPDFText_LoadPage(page.pageIdx);
  if (!textPage) throw new Error("Texto da fatura indisponível.");
  const ptr = api.wasmExports.malloc(32);
  const caracteres: Array<{ texto: string; topo: number | null }> = [];
  try {
    const total = api._FPDFText_CountChars(textPage);
    if (total > 40_000) throw new Error("Fatura com texto excessivo.");
    for (let i = 0; i < total; i++) {
      const unicode = api._FPDFText_GetUnicode(textPage, i);
      const texto = unicode ? String.fromCodePoint(unicode).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : " ";
      const ok = api._FPDFText_GetCharBox(textPage, i, ptr, ptr + 8, ptr + 16, ptr + 24);
      const coordenadas = new DataView(api.HEAPU8.buffer);
      const fundo = coordenadas.getFloat64(ptr + 16, true), topo = coordenadas.getFloat64(ptr + 24, true);
      const y = ok && topo - fundo >= 3 && topo - fundo <= 60 ? altura - topo : null;
      for (const letra of texto) caracteres.push({ texto: letra, topo: y });
    }
    const texto = caracteres.map(c => c.texto).join("");
    const marcadores = /codigo\s*de\s*debito\s*automatico|pix\s*(?:pague\s*aqui|copia\s*e\s*cola)|pague\s*(?:aqui|com\s*pix)|linha\s*digitavel|codigo\s*de\s*barras/g;
    let inicio: number | null = null;
    for (const match of texto.matchAll(marcadores)) {
      const valores = caracteres.slice(match.index, match.index + match[0].length).map(c => c.topo).filter((y): y is number => y !== null);
      if (!valores.length) continue;
      const y = Math.min(...valores);
      if (y >= altura * 0.65 && y < altura * 0.98) inicio = Math.min(inicio ?? y, y);
    }
    // Some CEMIG templates draw the footer headings as an image. Its repeated
    // UC is selectable text and locates the upper edge of that same payment slip.
    const uc = String(numeroUc ?? "").replace(/\D/g, "");
    if (inicio !== null && /^\d{12,13}$/.test(uc)) {
      const padrao = new RegExp(uc.split("").join("[.\\s-]*"), "g");
      for (const match of texto.matchAll(padrao)) {
        const valores = caracteres.slice(match.index, match.index + match[0].length).map(c => c.topo).filter((y): y is number => y !== null);
        if (!valores.length) continue;
        const y = Math.min(...valores);
        if (y >= altura * 0.8) inicio = Math.min(inicio, y - 18);
      }
    }
    if (inicio === null && /\bpix\b|(?:\d[.\s-]*){44}/.test(texto)) throw new Error("Área de pagamento não localizada com segurança.");
    return inicio === null ? null : Math.max(0, inicio - 8);
  } finally { api.wasmExports.free(ptr); api._FPDFText_ClosePage(textPage); }
}

/** Keeps the original page appearance, removes payment pixels, then adds a notice.
 * The source document is never overwritten or embedded as a hidden attachment. */
let fila: Promise<unknown> = Promise.resolve();
let pendentes = 0;
export async function gerarDemonstrativoConcessionaria(fatura: any, original: Buffer): Promise<Buffer> {
  if (pendentes >= 8) throw new Error("Visualização protegida em preparação. Tente novamente.");
  pendentes++;
  const trabalho = fila.then(() => gerarCopiaOriginal(original, fatura.numero_instalacao));
  fila = trabalho.catch(() => undefined);
  try { return await trabalho; } finally { pendentes--; }
}
async function gerarCopiaOriginal(original: Buffer, numeroUc?: unknown): Promise<Buffer> {
  if (!original || original.length > 10 * 1024 * 1024) throw new Error("Fatura original indisponível.");
  const library = await PDFiumLibrary.init();
  let documento: Awaited<ReturnType<typeof library.loadDocument>> | undefined;
  try {
    documento = await library.loadDocument(original);
    if (documento.getPageCount() < 1 || documento.getPageCount() > 6) throw new Error("Quantidade de páginas não suportada.");
    const paginas: Array<{ imagem: Buffer; largura: number; altura: number }> = [];
    let removeu = false, pixels = 0;
    for (const pagina of documento.pages()) {
      try {
        const { originalWidth: largura, originalHeight: altura } = pagina.getOriginalSize();
        if (largura < 200 || altura < 200 || largura > 1500 || altura > 2000) throw new Error("Dimensões da fatura não suportadas.");
        pixels += Math.floor(largura * 2) * Math.floor(altura * 2);
        if (pixels > 20_000_000) throw new Error("Fatura muito grande para visualização protegida.");
        const inicio = inicioPagamento(pagina, altura, numeroUc);
        const raster = await pagina.render({ scale: 2, render: async options => options.data });
        const rgba = Buffer.from(raster.data);
        if (inicio !== null) {
          rgba.fill(255, Math.max(0, Math.floor(inicio * 2)) * raster.width * 4);
          removeu = true;
        }
        const png = new PNG({ width: raster.width, height: raster.height });
        png.data = rgba;
        const imagem = PNG.sync.write(png, { colorType: 2 });
        paginas.push({ imagem, largura, altura });
      } finally { pagina.close(); }
    }
    if (!removeu) throw new Error("Área de pagamento não localizada com segurança.");
    return await new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ autoFirstPage: false, margin: 0, info: { Title: "Fatura CEMIG - demonstrativa, sem pagamento" } });
      const partes: Buffer[] = [];
      pdf.on("data", parte => partes.push(parte)); pdf.on("error", reject);
      pdf.on("end", () => resolve(Buffer.concat(partes)));
      for (const pagina of paginas) {
        pdf.addPage({ size: [pagina.largura, pagina.altura + 48], margin: 0 });
        pdf.rect(0, 0, pagina.largura, 48).fill("#E8F6F0");
        pdf.fillColor("#07533D").font("Helvetica-Bold").fontSize(11).text("FATURA CEMIG DEMONSTRATIVA - NÃO PAGAR", 16, 9, { width: pagina.largura - 32 });
        pdf.font("Helvetica").fontSize(9).text("Você optou pela fatura unificada. Pague somente a fatura Andrade Energy.", 16, 27, { width: pagina.largura - 32 });
        pdf.image(pagina.imagem, 0, 48, { width: pagina.largura, height: pagina.altura });
      }
      pdf.end();
    });
  } finally { documento?.destroy(); library.destroy(); }
}
