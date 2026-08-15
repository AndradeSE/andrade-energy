import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import { supabase } from "../../config/supabase";

const BUCKET = "faturas";

function moeda(valor: unknown) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function gerarPdf(fatura: any, tipo: "USINA" | "UNIFICADA") {
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 48, size: "A4" });
    const partes: Buffer[] = [];
    pdf.on("data", (parte) => partes.push(parte));
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.on("error", reject);

    pdf.fillColor("#0F172A").fontSize(22).text("Andrade Energy");
    pdf.moveDown(0.3).fillColor("#64748B").fontSize(11)
      .text(tipo === "UNIFICADA" ? "Fatura unificada de energia" : "Fatura da usina");
    pdf.moveDown(1.5).fillColor("#0F172A").fontSize(12)
      .text(`Referência: ${fatura.referencia}`)
      .text(`Unidade consumidora: ${fatura.numero_instalacao}`)
      .text(`Vencimento: ${fatura.vencimento}`)
      .text(`Modalidade: ${fatura.modalidade_faturamento}`);

    pdf.moveDown(1.5).fontSize(14).text("Resumo da cobrança");
    pdf.moveDown(0.5).fontSize(11);
    if (tipo === "UNIFICADA") {
      pdf.text(`Fatura CEMIG: ${moeda(fatura.valor_cemig)}`);
    }
    pdf.text(`Energia da usina: ${moeda(fatura.valor_usina)}`);
    pdf.moveDown(0.5).fontSize(15)
      .text(`Total: ${moeda(tipo === "UNIFICADA" ? fatura.valor_total_unificado : fatura.valor_usina)}`);

    pdf.moveDown(1.5).fontSize(12).text("Transparência do desconto");
    pdf.fontSize(11)
      .text(`Desconto contratado: ${Number(fatura.desconto_contratado_percentual ?? 0).toFixed(2)}%`)
      .text(`Economia real: ${moeda(fatura.economia_real)}`)
      .text(`Desconto final real: ${Number(fatura.desconto_real_percentual ?? 0).toFixed(2)}%`);
    pdf.moveDown(2).fillColor("#64748B").fontSize(9)
      .text("O desconto final real considera o valor completo da distribuidora, incluindo impostos, encargos e cobranças que não recebem desconto.");
    pdf.end();
  });
}

async function enviarPdf(caminho: string, conteudo: Buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  return caminho;
}

export async function armazenarDocumentosDaFatura(fatura: any, arquivoCemig: string) {
  const pasta = `${fatura.cliente_id}/${fatura.id}`;
  const original = await readFile(arquivoCemig);
  const [pdfUsina, pdfUnificada] = await Promise.all([
    gerarPdf(fatura, "USINA"),
    gerarPdf(fatura, "UNIFICADA"),
  ]);
  const [cemig, usina, unificada] = await Promise.all([
    enviarPdf(`${pasta}/cemig-original.pdf`, original),
    enviarPdf(`${pasta}/fatura-usina.pdf`, pdfUsina),
    enviarPdf(`${pasta}/fatura-unificada.pdf`, pdfUnificada),
  ]);
  const { error } = await supabase.from("faturas").update({
    pdf_cemig_url: cemig,
    pdf_usina_url: usina,
    pdf_unificada_url: unificada,
  }).eq("id", fatura.id);
  if (error) throw error;
  return { cemig, usina, unificada };
}

async function criarLinkTemporario(caminho?: string | null) {
  if (!caminho) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function incluirLinksTemporarios(fatura: any) {
  const [cemig, usina, unificada, boleto] = await Promise.all([
    criarLinkTemporario(fatura.pdf_cemig_url),
    criarLinkTemporario(fatura.pdf_usina_url),
    criarLinkTemporario(fatura.pdf_unificada_url),
    criarLinkTemporario(fatura.pdf_boleto_url),
  ]);
  return {
    ...fatura,
    pdf_cemig_url: cemig,
    pdf_usina_url: usina,
    pdf_unificada_url: unificada,
    pdf_boleto_url: boleto,
  };
}
