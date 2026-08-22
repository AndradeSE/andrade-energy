import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { supabase } from "../../config/supabase";

const BUCKET = "faturas";
const VERDE = "#107C5C";
const VERDE_ESCURO = "#07533D";
const VERDE_CLARO = "#E8F6F0";
const TEXTO = "#17312A";
const TEXTO_SECUNDARIO = "#5C6B65";
const BORDA = "#D8E7E0";
const LARGURA = 498;
const CAMINHOS_LOGO = [
  resolve(process.cwd(), "../assets/images/andrade-logo-horizontal.png"),
  resolve(process.cwd(), "assets/images/andrade-logo-horizontal.png"),
];

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

function textoCurto(valor: unknown, maximo = 56) {
  const texto = String(valor ?? "").trim();
  return texto.length > maximo ? `${texto.slice(0, Math.max(0, maximo - 1)).trim()}…` : texto;
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
      ? supabase.from("clientes").select("id,nome,cpf,endereco,email,whatsapp").eq("id", fatura.cliente_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })),
    fatura.unidades_consumidoras?.id ? Promise.resolve({ data: fatura.unidades_consumidoras, error: null }) : (fatura.unidade_consumidora_id
      ? supabase.from("unidades_consumidoras").select("id,numero,titular,cpf_titular,endereco,distribuidora").eq("id", fatura.unidade_consumidora_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })),
  ]);
  if (clienteResultado.error) throw clienteResultado.error;
  if (unidadeResultado.error) throw unidadeResultado.error;
  const cliente = clienteResultado.data ?? fatura.clientes ?? null;
  const unidade = unidadeResultado.data ?? fatura.unidades_consumidoras ?? null;

  // A fatura leva um resumo curto de economia para o cliente conseguir ver
  // a evolução sem precisar abrir várias competências no aplicativo.
  let historico: any[] = [];
  let erroHistorico: unknown = null;
  if (fatura.unidade_consumidora_id || fatura.cliente_id) {
    let consultaHistorico = supabase
      .from("faturas")
      .select("id,referencia,economia_real,economia")
      .order("referencia", { ascending: false })
      .limit(6);
    if (fatura.unidade_consumidora_id) {
      consultaHistorico = consultaHistorico.eq("unidade_consumidora_id", fatura.unidade_consumidora_id);
    } else {
      consultaHistorico = consultaHistorico.eq("cliente_id", fatura.cliente_id);
    }
    const resultadoHistorico = await consultaHistorico;
    historico = resultadoHistorico.data ?? [];
    erroHistorico = resultadoHistorico.error;
  }
  // O histórico é complementar: uma falha nele não impede a emissão do PDF.
  const historicoComAtual = erroHistorico ? [] : historico;
  if (!historicoComAtual.some((item: any) => item.id === fatura.id)) {
    historicoComAtual.unshift({
      id: fatura.id,
      referencia: fatura.referencia,
      economia_real: fatura.economia_real ?? fatura.economia,
    });
  }

  return {
    ...fatura,
    clientes: cliente,
    unidades_consumidoras: unidade,
    historico_economia: historicoComAtual.slice(0, 6).reverse(),
  };
}

function desenharLogoNoCabecalho(pdf: PDFKit.PDFDocument) {
  const caminhoLogo = CAMINHOS_LOGO.find((caminho) => existsSync(caminho));
  if (caminhoLogo) {
    pdf.image(caminhoLogo, 48, 9, { fit: [188, 84] });
    return;
  }
  pdf.fillColor("#071F4F").font("Helvetica-Bold").fontSize(19).text("ANDRADE", 48, 30);
  pdf.fillColor("#D99E00").rect(48, 55, 108, 3).fill();
  pdf.fillColor("#071F4F").font("Helvetica-Bold").fontSize(8).text("E N E R G Y", 166, 51);
}

/** Gera a fatura que o cliente recebe e pode baixar no aplicativo. */
export async function gerarPdfFatura(fatura: any, tipo: "USINA" | "UNIFICADA") {
  fatura = await incluirDadosDaUCNaFatura(fatura);
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margins: { top: 48, right: 48, bottom: 24, left: 48 },
      info: { Title: `Fatura Andrade Energy - ${fatura.referencia ?? "energia"}` },
    });
    const partes: Buffer[] = [];
    pdf.on("data", (parte) => partes.push(parte));
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.on("error", reject);

    const valorCemig = numero(fatura.valor_cemig);
    const valorUsina = numero(fatura.valor_usina ?? fatura.valor_andrade);
    const faturaSomenteAndrade = Boolean(fatura.fatura_somente_andrade);
    const documentoUnificado = tipo === "UNIFICADA" && !faturaSomenteAndrade;
    const valorTotal = documentoUnificado ? numero(fatura.valor_total_unificado ?? fatura.valor_total) : valorUsina;
    const economiaReal = numero(fatura.economia_real ?? fatura.economia);
    const valorSemAndrade = documentoUnificado
      ? numero(fatura.valor_referencia_sem_andrade) || Math.max(0, valorTotal + economiaReal)
      : numero(fatura.valor_energia_cheia) || Math.max(0, valorTotal + economiaReal);
    const descontoContratado = numero(fatura.desconto_contratado_percentual ?? fatura.desconto_percentual);
    const descontoReal = numero(fatura.desconto_real_percentual);
    const consumoKwh = numero(fatura.consumo_kwh ?? fatura.consumo);
    const energiaInjetada = numero(fatura.energia_injetada);
    const energiaCompensada = numero(fatura.energia_compensada);
    const saldoCreditos = numero(fatura.saldo_atual);
    const energiaCobrada = numero(fatura.base_calculo_kwh ?? fatura.energia_compensada ?? fatura.consumo_kwh ?? fatura.consumo);
    const tarifaAndrade = numero(fatura.tarifa_andrade);
    const cliente = fatura.clientes ?? {};
    const unidade = fatura.unidades_consumidoras ?? {};
    // Mantemos na Andrade os mesmos dados que identificam a conta CEMIG:
    // titular, documento, UC, concessionária e endereço da unidade.
    const titular = unidade.titular ?? cliente.nome ?? "Cliente não informado";
    const documento = unidade.cpf_titular ?? cliente.cpf ?? null;
    const endereco = unidade.endereco ?? cliente.endereco ?? "Endereço não informado";
    const historicoEconomia = Array.isArray(fatura.historico_economia) ? fatura.historico_economia : [];

    pdf.rect(0, 0, 595, 96).fill("#FFFFFF");
    desenharLogoNoCabecalho(pdf);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8.5).text(documentoUnificado ? "Fatura unificada de energia" : "Cobrança de energia solar", 48, 77);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(9).text(`Referência: ${fatura.referencia ?? "Não informada"}`, 350, 33, { width: 196, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`Vencimento: ${fatura.vencimento ?? "Não informado"}`, 350, 51, { width: 196, align: "right" });
    pdf.strokeColor(BORDA).lineWidth(1).moveTo(48, 95).lineTo(547, 95).stroke();

    pdf.roundedRect(48, 114, LARGURA, 76, 10).fill("#F8FBF9").strokeColor(BORDA).stroke();
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7).text("TITULAR DA CONTA", 62, 127);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text(textoCurto(titular, 39), 62, 139, { width: 260 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(documento ? `CPF/CNPJ: ${documento}` : "CPF/CNPJ não informado", 62, 156, { width: 260 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(textoCurto(endereco, 63), 62, 168, { width: 260 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7).text("DADOS DA UNIDADE", 336, 127, { width: 194, align: "right" });
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text(`UC ${fatura.numero_instalacao ?? unidade.numero ?? "Não informada"}`, 336, 139, { width: 194, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(`${unidade.distribuidora ?? fatura.distribuidora ?? "Concessionária"} · ${String(fatura.modalidade_faturamento ?? "COMPENSACAO").toLowerCase() === "injecao" ? "Injeção" : "Compensação"}`, 336, 156, { width: 194, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(textoCurto(endereco, 42), 336, 168, { width: 194, align: "right" });

    // Quadro técnico inspirado na leitura da conta da CEMIG: consumo,
    // energia compensada/injetada e créditos aparecem separados dos valores.
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Energia e créditos", 48, 207);
    pdf.roundedRect(48, 224, LARGURA, 67, 10).fill("#F8FBF9").strokeColor(BORDA).stroke();
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
      const y = 236 + linha * 26;
      const saldoEmDestaque = indice === 3;
      if (saldoEmDestaque) pdf.roundedRect(306, 257, 210, 28, 7).fill(VERDE_CLARO);
      pdf.fillColor(saldoEmDestaque ? VERDE_ESCURO : TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7.5).text(rotulo, x, y, { width: 210 });
      pdf.fillColor(saldoEmDestaque ? VERDE_ESCURO : TEXTO).font("Helvetica-Bold").fontSize(saldoEmDestaque ? 11 : 9.5).text(valor, x, y + 10, { width: 210 });
    });

    pdf.roundedRect(48, 307, LARGURA, 84, 12).fill(VERDE_CLARO);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8.5).text("TOTAL A PAGAR NESTE MÊS", 66, 323);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(27).text(moeda(valorTotal), 66, 336);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(documentoUnificado ? "CEMIG + energia solar Andrade Energy" : "Energia solar Andrade Energy", 66, 360);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7.5).text("Sem benefício Andrade", 344, 321, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(11).text(moeda(valorSemAndrade), 344, 337, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(`Economia: ${moeda(economiaReal)}`, 344, 353, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.5).text(`Desconto contratado: ${percentual(descontoContratado)}`, 344, 365, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.5).text(`Após impostos: ${percentual(descontoReal)}`, 344, 374, { width: 170, align: "right" });

    const possuiGD2 = temGD2(fatura);
    if (possuiGD2) {
      pdf.roundedRect(48, 401, LARGURA, 24, 8).fill("#FFF5D6").strokeColor("#F0CA70").stroke();
      pdf.fillColor("#805500").font("Helvetica-Bold").fontSize(7.2).text(
        "Custos obrigatórios da rede: permanecem na fatura CEMIG e podem reduzir o desconto final.",
        62,
        409,
        { width: 465, align: "center" }
      );
    }

    const yResumoTitulo = possuiGD2 ? 439 : 411;
    const yResumo = yResumoTitulo + 17;
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Resumo da cobrança", 48, yResumoTitulo);
    pdf.roundedRect(48, yResumo, LARGURA, 79, 10).fill("#FFFFFF").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, yResumo + 14, documentoUnificado ? "Sem o benefício Andrade Energy" : "Energia solar sem o benefício Andrade", moeda(valorSemAndrade), true);
    desenharLinha(pdf, yResumo + 32);
    desenharLinhaDeValor(pdf, yResumo + 40, "Você paga neste mês", moeda(valorTotal), true);
    desenharLinha(pdf, yResumo + 58);
    desenharLinhaDeValor(pdf, yResumo + 66, "Economia real no mês", moeda(economiaReal), true);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(`Desconto contratado: ${percentual(descontoContratado)}  |  Desconto final real: ${percentual(descontoReal)}`, 64, yResumo + 78, { width: 465, align: "center" });

    const yComposicaoTitulo = yResumo + 99;
    const yComposicao = yComposicaoTitulo + 17;
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text(documentoUnificado ? "Como chegamos ao total unificado" : "Como chegamos à cobrança Andrade", 48, yComposicaoTitulo);
    pdf.roundedRect(48, yComposicao, LARGURA, 82, 10).fill("#F8FBF9").strokeColor(BORDA).stroke();
    if (documentoUnificado) {
      desenharLinhaDeValor(pdf, yComposicao + 12, "1. Conta da concessionária", moeda(valorCemig));
      desenharLinha(pdf, yComposicao + 28);
      desenharLinhaDeValor(pdf, yComposicao + 34, `2. Energia Andrade (${energia(energiaCobrada)})`, moeda(valorUsina));
      desenharLinha(pdf, yComposicao + 50);
      desenharLinhaDeValor(pdf, yComposicao + 56, "3. Total unificado a pagar", moeda(valorTotal), true);
    } else {
      desenharLinhaDeValor(pdf, yComposicao + 12, `Energia considerada (${energia(energiaCobrada)})`, "");
      desenharLinha(pdf, yComposicao + 28);
      desenharLinhaDeValor(pdf, yComposicao + 34, "Tarifa Andrade por kWh", moeda(tarifaAndrade));
      desenharLinha(pdf, yComposicao + 50);
      desenharLinhaDeValor(pdf, yComposicao + 56, "Total Andrade Energy", moeda(valorTotal), true);
    }
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(
      documentoUnificado ? "A conta CEMIG e a energia solar são cobradas juntas nesta fatura." : "A conta CEMIG é paga diretamente à concessionária.",
      64,
      yComposicao + 69,
      { width: 465, align: "center" }
    );

    const yInferiorTitulo = yComposicao + 102;
    const yInferior = yInferiorTitulo + 17;
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Economia mensal", 48, yInferiorTitulo);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Pagamento", 305, yInferiorTitulo);
    pdf.roundedRect(48, yInferior, 238, 105, 10).fill("#FFFFFF").strokeColor(BORDA).stroke();
    pdf.roundedRect(305, yInferior, 241, 105, 10).fill("#FFFFFF").strokeColor(BORDA).stroke();

    const ultimasEconomias: number[] = historicoEconomia.slice(-6).map((valor: unknown): number => numero(valor));
    if (ultimasEconomias.some((valor: number) => valor > 0)) {
      const maiorEconomia = Math.max(1, ...ultimasEconomias);
      ultimasEconomias.forEach((valor: number, indice: number) => {
        const altura = Math.max(8, (valor / maiorEconomia) * 42);
        const x = 66 + indice * 32;
        pdf.roundedRect(x, yInferior + 63 - altura, 16, altura, 3).fill(indice === ultimasEconomias.length - 1 ? VERDE : "#A8D8C6");
      });
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.5).text("Últimos meses", 66, yInferior + 70);
      pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8.5).text(`Economia acumulada: ${moeda(ultimasEconomias.reduce((total: number, valor: number) => total + valor, 0))}`, 66, yInferior + 84);
    } else {
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text("O gráfico aparecerá quando houver competências processadas.", 66, yInferior + 39, { width: 198, align: "center" });
    }

    pdf.roundedRect(320, yInferior + 15, 54, 54, 7).fill("#F2F7F5").strokeColor(BORDA).stroke();
    pdf.strokeColor(VERDE).lineWidth(2).moveTo(328, yInferior + 27).lineTo(328, yInferior + 22).lineTo(333, yInferior + 22).stroke();
    pdf.strokeColor(VERDE).lineWidth(2).moveTo(366, yInferior + 27).lineTo(366, yInferior + 22).lineTo(361, yInferior + 22).stroke();
    pdf.strokeColor(VERDE).lineWidth(2).moveTo(328, yInferior + 57).lineTo(328, yInferior + 62).lineTo(333, yInferior + 62).stroke();
    pdf.strokeColor(VERDE).lineWidth(2).moveTo(366, yInferior + 57).lineTo(366, yInferior + 62).lineTo(361, yInferior + 62).stroke();
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(7).text("QR PIX", 329, yInferior + 38, { width: 36, align: "center" });
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(7.5).text("Código de barras", 389, yInferior + 16);
    const barras = [2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3, 1, 2, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 2, 4];
    let xBarra = 389;
    barras.forEach((largura) => { pdf.rect(xBarra, yInferior + 31, largura, 25).fill("#17312A"); xBarra += largura + 1.4; });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.3).text("QR Pix e código de barras serão preenchidos automaticamente quando disponíveis.", 389, yInferior + 65, { width: 136 });
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

/** Regera somente os demonstrativos Andrade sem alterar a conta CEMIG original. */
export async function regenerarDocumentosGeradosDaFatura(fatura: any) {
  const pasta = `${fatura.cliente_id}/${fatura.id}`;
  const [pdfUsina, pdfUnificada] = await Promise.all([
    gerarPdfFatura(fatura, "USINA"),
    gerarPdfFatura(fatura, "UNIFICADA"),
  ]);
  const [usina, unificada] = await Promise.all([
    enviarPdf(`${pasta}/fatura-usina.pdf`, pdfUsina),
    enviarPdf(`${pasta}/fatura-unificada.pdf`, pdfUnificada),
  ]);
  const { error } = await supabase
    .from("faturas")
    .update({ pdf_usina_url: usina, pdf_unificada_url: unificada })
    .eq("id", fatura.id);
  if (error) throw error;
  return { ...fatura, pdf_usina_url: usina, pdf_unificada_url: unificada };
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
