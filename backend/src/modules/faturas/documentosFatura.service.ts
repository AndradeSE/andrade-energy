import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import { supabase } from "../../config/supabase";

const BUCKET = "faturas";
const VERDE = "#107C5C";
const VERDE_ESCURO = "#07533D";
const VERDE_CLARO = "#E8F6F0";
const TEXTO = "#17312A";
const TEXTO_SECUNDARIO = "#5C6B65";
const BORDA = "#D8E7E0";
const LARGURA = 498;

function moeda(valor: unknown) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function percentual(valor: unknown) {
  return `${numero(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function desenharLinha(pdf: PDFKit.PDFDocument, y: number) {
  pdf.strokeColor(BORDA).lineWidth(1).moveTo(48, y).lineTo(48 + LARGURA, y).stroke();
}

function desenharLinhaDeValor(pdf: PDFKit.PDFDocument, y: number, rotulo: string, valor: string, destaque = false) {
  pdf.fillColor(destaque ? TEXTO : TEXTO_SECUNDARIO).font("Helvetica").fontSize(10).text(rotulo, 64, y, { width: 290 });
  pdf.fillColor(destaque ? VERDE_ESCURO : TEXTO).font(destaque ? "Helvetica-Bold" : "Helvetica").fontSize(destaque ? 12 : 10).text(valor, 365, y - (destaque ? 1 : 0), { width: 160, align: "right" });
}

function temGD2(fatura: any) {
  return String(fatura.modalidade_faturamento ?? "").toUpperCase() === "COMPENSACAO" && (
    numero(fatura.custo_disponibilidade) > 0 ||
    (numero(fatura.tarifa_gd) > 0 && numero(fatura.tarifa_gd) < numero(fatura.tarifa_cheia))
  );
}

/** Gera a fatura que o cliente recebe e pode baixar no aplicativo. */
export function gerarPdfFatura(fatura: any, tipo: "USINA" | "UNIFICADA") {
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 48, size: "A4", info: { Title: `Fatura Andrade Energy - ${fatura.referencia ?? "energia"}` } });
    const partes: Buffer[] = [];
    pdf.on("data", (parte) => partes.push(parte));
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.on("error", reject);

    const valorCemig = numero(fatura.valor_cemig);
    const valorUsina = numero(fatura.valor_usina ?? fatura.valor_andrade);
    const valorTotal = tipo === "UNIFICADA" ? numero(fatura.valor_total_unificado ?? fatura.valor_total) : valorUsina;
    const economiaReal = numero(fatura.economia_real ?? fatura.economia);
    const valorSemAndrade = numero(fatura.valor_referencia_sem_andrade) || Math.max(0, valorTotal + economiaReal);
    const descontoContratado = numero(fatura.desconto_contratado_percentual ?? fatura.desconto_percentual);
    const descontoReal = numero(fatura.desconto_real_percentual);
    const baseKwh = numero(fatura.base_calculo_kwh ?? fatura.energia_compensada ?? fatura.energia_injetada);

    pdf.rect(0, 0, 595, 112).fill(VERDE_ESCURO);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text("Andrade Energy", 48, 38);
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(10).text(tipo === "UNIFICADA" ? "Sua fatura de energia, explicada de forma simples" : "Cobrança de energia solar", 48, 67);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10).text(`Referência: ${fatura.referencia ?? "Não informada"}`, 350, 42, { width: 196, align: "right" });
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(9).text(`Vencimento: ${fatura.vencimento ?? "Não informado"}`, 350, 62, { width: 196, align: "right" });

    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(8).text("UNIDADE CONSUMIDORA", 48, 135);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(14).text(`UC ${fatura.numero_instalacao ?? "Não informada"}`, 48, 149);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(9).text(`Modalidade: ${String(fatura.modalidade_faturamento ?? "COMPENSACAO").toLowerCase() === "injecao" ? "injeção" : "compensação"}`, 48, 171);

    pdf.roundedRect(48, 198, LARGURA, 110, 14).fill(VERDE_CLARO);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(10).text("VOCÊ PAGA NESTA FATURA", 68, 219);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(27).text(moeda(valorTotal), 68, 238);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(9).text("Total de CEMIG e Andrade Energy", 68, 273);
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(10).text("SUA ECONOMIA REAL", 344, 219, { width: 170, align: "right" });
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(20).text(moeda(economiaReal), 344, 239, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(9).text(`Desconto real: ${percentual(descontoReal)}`, 344, 274, { width: 170, align: "right" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(13).text("Entenda a sua cobrança", 48, 338);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(9).text("Comparamos o valor cheio da energia com o total que você paga neste mês.", 48, 357);
    pdf.roundedRect(48, 382, LARGURA, 150, 12).fill("#FFFFFF").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, 404, "Sem o benefício Andrade Energy", moeda(valorSemAndrade));
    desenharLinha(pdf, 430);
    desenharLinhaDeValor(pdf, 445, "Você paga neste mês", moeda(valorTotal), true);
    desenharLinha(pdf, 471);
    desenharLinhaDeValor(pdf, 486, "Sua economia real", moeda(economiaReal), true);
    desenharLinha(pdf, 512);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8.5).text(`Desconto contratado: ${percentual(descontoContratado)}  |  Desconto final real: ${percentual(descontoReal)}`, 64, 519, { width: 465, align: "center" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(13).text("De onde vem esse total", 48, 560);
    pdf.roundedRect(48, 584, LARGURA, 99, 12).fill("#F8FBF9").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, 604, "Parte que permanece na CEMIG", moeda(valorCemig));
    desenharLinha(pdf, 628);
    desenharLinhaDeValor(pdf, 643, "Energia solar da Andrade Energy", moeda(valorUsina));
    desenharLinha(pdf, 667);
    desenharLinhaDeValor(pdf, 678, "Total a pagar", moeda(valorTotal), true);

    let yAviso = 704;
    if (baseKwh > 0) {
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8.5).text(`Energia considerada nesta fatura: ${baseKwh.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kWh`, 48, yAviso);
      yAviso += 19;
    }
    if (temGD2(fatura)) {
      pdf.roundedRect(48, yAviso, LARGURA, 48, 10).fill("#FFF7E8");
      pdf.fillColor("#8A5A00").font("Helvetica-Bold").fontSize(9).text("Por que o desconto real pode ser menor que o contratado?", 64, yAviso + 10);
      pdf.fillColor("#725B2D").font("Helvetica").fontSize(8).text("Na GD II, custos obrigatórios da rede e de disponibilidade continuam na fatura da CEMIG. Por isso, a economia final é calculada sobre o crédito efetivamente compensado.", 64, yAviso + 23, { width: 465, lineGap: 1 });
      yAviso += 61;
    }

    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text("Esta é uma fatura explicativa da Andrade Energy. A conta original da CEMIG permanece disponível no aplicativo.", 48, Math.min(yAviso + 7, 770), { width: LARGURA, align: "center" });
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(8).text("ANDRADE ENERGY", 48, 782, { width: LARGURA, align: "center" });
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

/** Guarda a conta original que serviu de base para a produção da usina. */
export async function armazenarContaDeEnergiaDaUsina(usinaId: string, fechamentoId: string, arquivoCemig: string) {
  const original = await readFile(arquivoCemig);
  return enviarPdf(`usinas/${usinaId}/${fechamentoId}/conta-concessionaria.pdf`, original);
}

export async function armazenarDocumentosDaFatura(fatura: any, arquivoCemig: string) {
  const pasta = `${fatura.cliente_id}/${fatura.id}`;
  const original = await readFile(arquivoCemig);
  const [pdfUsina, pdfUnificada] = await Promise.all([
    gerarPdfFatura(fatura, "USINA"),
    gerarPdfFatura(fatura, "UNIFICADA"),
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
