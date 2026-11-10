import PDFDocument from "pdfkit";
import { createHash } from "node:crypto";

export function deveGerarDemonstrativoConcessionaria(fatura: any, consumidor: boolean) {
  return consumidor && fatura.fatura_somente_andrade !== true && Boolean(fatura.pdf_cemig_url);
}

/** Whitelist only: never copy payment payloads or pages from the original bill. */
export function dadosDemonstrativoConcessionaria(fatura: any) {
  const texto = (valor: unknown) => String(valor ?? "").replace(/[\r\n\t]+/g, " ").slice(0, 160);
  const numero = (valor: unknown) => valor !== null && valor !== undefined && valor !== "" && Number.isFinite(Number(valor)) ? Number(valor) : null;
  return {
    cliente: texto(fatura.clientes?.nome),
    uc: texto(fatura.numero_instalacao),
    referencia: texto(fatura.referencia),
    vencimento: texto(fatura.vencimento).slice(0, 10),
    consumo: numero(fatura.consumo_kwh ?? fatura.consumo),
    compensada: numero(fatura.energia_compensada),
    valorConcessionaria: numero(fatura.valor_cemig),
  };
}

export function chaveDemonstrativoConcessionaria(fatura: any) {
  return createHash("sha256").update(JSON.stringify(dadosDemonstrativoConcessionaria(fatura))).digest("hex").slice(0, 24);
}

export async function gerarDemonstrativoConcessionaria(fatura: any): Promise<Buffer> {
  const dados = dadosDemonstrativoConcessionaria(fatura);
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Demonstrativo da concessionária - sem pagamento" } });
    const partes: Buffer[] = [];
    pdf.on("data", parte => partes.push(parte));
    pdf.on("error", reject);
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.roundedRect(48, 48, 499, 82, 14).fill("#07533D");
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(21).text("Conta da concessionária", 68, 68);
    pdf.font("Helvetica").fontSize(11).text("DEMONSTRATIVO RESUMIDO - SEM MEIOS DE PAGAMENTO", 68, 103);
    pdf.roundedRect(48, 152, 499, 88, 12).fill("#E8F6F0");
    pdf.fillColor("#07533D").font("Helvetica-Bold").fontSize(14).text("Não pague este demonstrativo", 68, 171);
    pdf.font("Helvetica").fontSize(11).text("Você optou pela fatura unificada. O pagamento deve ser feito somente pela fatura Andrade Energy correspondente.", 68, 197, { width: 455, lineGap: 3 });
    let y = 274;
    const linha = (titulo: string, valor: string) => {
      pdf.fillColor("#5C6B65").font("Helvetica").fontSize(11).text(titulo, 58, y, { width: 190 });
      pdf.fillColor("#17312A").font("Helvetica-Bold").fontSize(12).text(valor || "Não informado", 252, y, { width: 280 });
      y += Math.max(42, pdf.heightOfString(valor || "Não informado", { width: 280 }) + 20);
    };
    linha("Cliente", dados.cliente);
    linha("Unidade consumidora", dados.uc);
    linha("Competência", dados.referencia);
    linha("Vencimento de referência", dados.vencimento ? dados.vencimento.split("-").reverse().join("/") : "");
    linha("Consumo registrado", dados.consumo === null ? "" : `${dados.consumo.toLocaleString("pt-BR")} kWh`);
    linha("Energia compensada", dados.compensada === null ? "" : `${dados.compensada.toLocaleString("pt-BR")} kWh`);
    linha("Parcela da concessionária", dados.valorConcessionaria === null ? "" : dados.valorConcessionaria.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
    pdf.font("Helvetica").fontSize(10).fillColor("#5C6B65").text("Resumo dos dados registrados no aplicativo. Não substitui o documento fiscal original da concessionária, preservado pelo gerador. Não contém boleto, código de barras ou QR Code para pagamento.", 58, Math.max(645, y + 12), { width: 475, lineGap: 4 });
    pdf.end();
  });
}
