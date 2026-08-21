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

function energia(valor: unknown) {
  return `${numero(valor).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kWh`;
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

async function incluirDadosDaUCNaFatura(fatura: any) {
  const [clienteResultado, unidadeResultado] = await Promise.all([
    fatura.clientes?.nome ? Promise.resolve({ data: fatura.clientes, error: null }) : (fatura.cliente_id
      ? supabase.from("clientes").select("id,nome,cpf,endereco").eq("id", fatura.cliente_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })),
    fatura.unidades_consumidoras?.id ? Promise.resolve({ data: fatura.unidades_consumidoras, error: null }) : (fatura.unidade_consumidora_id
      ? supabase.from("unidades_consumidoras").select("id,numero,endereco,distribuidora").eq("id", fatura.unidade_consumidora_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })),
  ]);
  if (clienteResultado.error) throw clienteResultado.error;
  if (unidadeResultado.error) throw unidadeResultado.error;
  return { ...fatura, clientes: clienteResultado.data ?? null, unidades_consumidoras: unidadeResultado.data ?? null };
}

/** Gera a fatura que o cliente recebe e pode baixar no aplicativo. */
export async function gerarPdfFatura(fatura: any, tipo: "USINA" | "UNIFICADA") {
  fatura = await incluirDadosDaUCNaFatura(fatura);
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
    const consumoKwh = numero(fatura.consumo_kwh ?? fatura.consumo);
    const energiaInjetada = numero(fatura.energia_injetada);
    const energiaCompensada = numero(fatura.energia_compensada);
    const saldoCreditos = numero(fatura.saldo_atual);
    const energiaCobrada = numero(fatura.base_calculo_kwh ?? fatura.energia_compensada ?? fatura.consumo_kwh ?? fatura.consumo);
    const tarifaCemig = numero(fatura.tarifa_cheia);
    const tarifaAndrade = numero(fatura.tarifa_andrade);
    const cliente = fatura.clientes ?? {};
    const unidade = fatura.unidades_consumidoras ?? {};
    const endereco = unidade.endereco ?? cliente.endereco ?? "Endereço não informado";

    pdf.rect(0, 0, 595, 112).fill(VERDE_ESCURO);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text("Andrade Energy", 48, 38);
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(10).text(tipo === "UNIFICADA" ? "Sua fatura de energia, explicada de forma simples" : "Cobrança de energia solar", 48, 67);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10).text(`Referência: ${fatura.referencia ?? "Não informada"}`, 350, 42, { width: 196, align: "right" });
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(9).text(`Vencimento: ${fatura.vencimento ?? "Não informado"}`, 350, 62, { width: 196, align: "right" });

    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(8).text("CLIENTE", 48, 132);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(12).text(cliente.nome ?? "Cliente não informado", 48, 145, { width: 275, ellipsis: true });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`${cliente.cpf ? `CPF/CNPJ: ${cliente.cpf} · ` : ""}${endereco}`, 48, 164, { width: 280, height: 22, ellipsis: true });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(8).text("UNIDADE CONSUMIDORA", 342, 132, { width: 204, align: "right" });
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(12).text(`UC ${fatura.numero_instalacao ?? unidade.numero ?? "Não informada"}`, 342, 145, { width: 204, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`${unidade.distribuidora ?? fatura.distribuidora ?? "Concessionária"} · ${String(fatura.modalidade_faturamento ?? "COMPENSACAO").toLowerCase() === "injecao" ? "injeção" : "compensação"}`, 342, 164, { width: 204, align: "right" });

    // Quadro técnico inspirado na leitura da conta da CEMIG: consumo,
    // energia compensada/injetada e créditos aparecem separados dos valores.
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(12).text("Demonstrativo de energia e créditos", 48, 198);
    pdf.roundedRect(48, 220, LARGURA, 80, 12).fill("#F8FBF9").strokeColor(BORDA).stroke();
    const itensEnergia = [
      ["Consumo da unidade", energia(consumoKwh)],
      ["Energia compensada no mês", energia(energiaCompensada)],
      ["Energia injetada no mês", energia(energiaInjetada)],
      ["Saldo atual de créditos", energia(saldoCreditos)],
    ];
    itensEnergia.forEach(([rotulo, valor], indice) => {
      const coluna = indice % 2;
      const linha = Math.floor(indice / 2);
      const x = coluna === 0 ? 64 : 315;
      const y = 235 + linha * 32;
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7.5).text(rotulo, x, y, { width: 210 });
      pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(11).text(valor, x, y + 11, { width: 210 });
    });

    pdf.roundedRect(48, 319, LARGURA, 87, 14).fill(VERDE_CLARO);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(10).text("TOTAL A PAGAR NESTE MÊS", 68, 339);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(25).text(moeda(valorTotal), 68, 356);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8.5).text("CEMIG + energia solar Andrade Energy", 68, 386);
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(9.5).text("SUA ECONOMIA REAL", 344, 340, { width: 170, align: "right" });
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(18).text(moeda(economiaReal), 344, 358, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8.5).text(`Desconto final real: ${percentual(descontoReal)}`, 344, 386, { width: 170, align: "right" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(12).text("Resumo da cobrança", 48, 430);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8.5).text("Comparativo entre a energia sem benefício e o valor final desta competência.", 48, 447);
    pdf.roundedRect(48, 466, LARGURA, 111, 12).fill("#FFFFFF").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, 482, "Valor sem o benefício Andrade Energy", moeda(valorSemAndrade));
    desenharLinha(pdf, 504);
    desenharLinhaDeValor(pdf, 516, "Valor que você paga neste mês", moeda(valorTotal), true);
    desenharLinha(pdf, 538);
    desenharLinhaDeValor(pdf, 550, "Economia real neste mês", moeda(economiaReal), true);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`Desconto contratado: ${percentual(descontoContratado)}  |  Desconto final real: ${percentual(descontoReal)}`, 64, 564, { width: 465, align: "center" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(12).text("Como chegamos ao total unificado", 48, 587);
    pdf.roundedRect(48, 607, LARGURA, 128, 12).fill("#F8FBF9").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, 620, `Energia considerada (${energia(energiaCobrada)})`, "");
    desenharLinha(pdf, 638);
    desenharLinhaDeValor(pdf, 647, "Tarifa CEMIG por kWh", moeda(tarifaCemig));
    desenharLinha(pdf, 665);
    desenharLinhaDeValor(pdf, 674, "Tarifa Andrade Energy por kWh", moeda(tarifaAndrade));
    desenharLinha(pdf, 692);
    desenharLinhaDeValor(pdf, 701, "Parte que permanece na CEMIG", moeda(valorCemig));
    desenharLinha(pdf, 719);
    desenharLinhaDeValor(pdf, 728, "Energia solar Andrade Energy", moeda(valorUsina));
    desenharLinha(pdf, 746);
    desenharLinhaDeValor(pdf, 755, "Total unificado", moeda(valorTotal), true);

    let yAviso = 742;
    if (temGD2(fatura)) {
      pdf.addPage();
      yAviso = 62;
      pdf.roundedRect(48, yAviso, LARGURA, 48, 10).fill("#FFF7E8");
      pdf.fillColor("#8A5A00").font("Helvetica-Bold").fontSize(9).text("Por que o desconto real pode ser menor que o contratado?", 64, yAviso + 10);
      pdf.fillColor("#725B2D").font("Helvetica").fontSize(8).text("Na GD II, custos obrigatórios da rede e de disponibilidade continuam na fatura da CEMIG. Por isso, a economia final é calculada sobre o crédito efetivamente compensado.", 64, yAviso + 23, { width: 465, lineGap: 1 });
      yAviso += 61;
    }

    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text("Total unificado = parte CEMIG + energia solar Andrade Energy. Esta é uma fatura explicativa; a conta original da CEMIG permanece disponível no aplicativo.", 48, yAviso + 5, { width: LARGURA, align: "center" });
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(8).text("ANDRADE ENERGY", 48, yAviso + 40, { width: LARGURA, align: "center" });
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
