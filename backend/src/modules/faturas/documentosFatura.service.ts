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
    // Mantemos na Andrade os mesmos dados que identificam a conta CEMIG:
    // titular, documento, UC, concessionária e endereço da unidade.
    const titular = unidade.titular ?? cliente.nome ?? "Cliente não informado";
    const documento = unidade.cpf_titular ?? cliente.cpf ?? null;
    const endereco = unidade.endereco ?? cliente.endereco ?? "Endereço não informado";
    const historicoEconomia = Array.isArray(fatura.historico_economia) ? fatura.historico_economia : [];
    const economiaAcumulada = historicoEconomia.reduce(
      (total: number, item: any) => total + numero(item.economia_real ?? item.economia),
      0
    );

    pdf.rect(0, 0, 595, 96).fill(VERDE_ESCURO);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text("Andrade Energy", 48, 31);
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(8.5).text(tipo === "UNIFICADA" ? "Fatura unificada de energia" : "Cobrança de energia solar", 48, 57);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9).text(`Referência: ${fatura.referencia ?? "Não informada"}`, 350, 33, { width: 196, align: "right" });
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(8).text(`Vencimento: ${fatura.vencimento ?? "Não informado"}`, 350, 51, { width: 196, align: "right" });

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
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7.5).text(rotulo, x, y, { width: 210 });
      pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(9.5).text(valor, x, y + 10, { width: 210 });
    });

    pdf.roundedRect(48, 307, LARGURA, 68, 12).fill(VERDE_CLARO);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8.5).text("TOTAL A PAGAR NESTE MÊS", 66, 323);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(20).text(moeda(valorTotal), 66, 338);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text("CEMIG + energia solar Andrade Energy", 66, 360);
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(8.5).text("SUA ECONOMIA REAL", 344, 323, { width: 170, align: "right" });
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(15).text(moeda(economiaReal), 344, 338, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(`Desconto final real: ${percentual(descontoReal)}`, 344, 360, { width: 170, align: "right" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Resumo da cobrança", 48, 395);
    pdf.roundedRect(48, 412, LARGURA, 79, 10).fill("#FFFFFF").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, 426, "Sem o benefício Andrade Energy", moeda(valorSemAndrade));
    desenharLinha(pdf, 444);
    desenharLinhaDeValor(pdf, 452, "Você paga neste mês", moeda(valorTotal), true);
    desenharLinha(pdf, 470);
    desenharLinhaDeValor(pdf, 478, "Economia real no mês", moeda(economiaReal), true);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(`Desconto contratado: ${percentual(descontoContratado)}  |  Desconto final real: ${percentual(descontoReal)}`, 64, 490, { width: 465, align: "center" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Como chegamos ao total unificado", 48, 510);
    pdf.roundedRect(48, 527, LARGURA, 76, 10).fill("#F8FBF9").strokeColor(BORDA).stroke();
    desenharLinhaDeValor(pdf, 538, `Energia considerada (${energia(energiaCobrada)})`, "");
    desenharLinha(pdf, 554);
    desenharLinhaDeValor(pdf, 560, "Tarifa CEMIG / Andrade por kWh", `${moeda(tarifaCemig)} / ${moeda(tarifaAndrade)}`);
    desenharLinha(pdf, 576);
    desenharLinhaDeValor(pdf, 582, "CEMIG + energia solar Andrade Energy", `${moeda(valorCemig)} + ${moeda(valorUsina)}`);
    desenharLinha(pdf, 598);
    desenharLinhaDeValor(pdf, 604, "Total unificado", moeda(valorTotal), true);

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Histórico mensal de economia", 48, 625);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(
      historicoEconomia.length ? `Economia acumulada: ${moeda(economiaAcumulada)}` : "O histórico aparecerá nas próximas faturas.",
      48,
      638,
      { width: LARGURA }
    );
    pdf.roundedRect(48, 653, LARGURA, 104, 10).fill("#FFFFFF").strokeColor(BORDA).stroke();
    const valoresHistorico = historicoEconomia.map((item: any) => numero(item.economia_real ?? item.economia));
    const maiorEconomia = Math.max(1, ...valoresHistorico);
    const graficoX = 72;
    const graficoY = 673;
    const graficoAltura = 54;
    const graficoLargura = 448;
    pdf.strokeColor("#DDE9E4").lineWidth(1).moveTo(graficoX, graficoY + graficoAltura).lineTo(graficoX + graficoLargura, graficoY + graficoAltura).stroke();
    if (historicoEconomia.length) {
      const espaco = graficoLargura / historicoEconomia.length;
      const larguraBarra = Math.min(38, Math.max(18, espaco - 16));
      historicoEconomia.forEach((item: any, indice: number) => {
        const valor = numero(item.economia_real ?? item.economia);
        const altura = Math.max(3, (valor / maiorEconomia) * graficoAltura);
        const x = graficoX + indice * espaco + (espaco - larguraBarra) / 2;
        const y = graficoY + graficoAltura - altura;
        pdf.roundedRect(x, y, larguraBarra, altura, 3).fill(indice === historicoEconomia.length - 1 ? VERDE : "#9DCFBF");
        pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.5).text(textoCurto(item.referencia, 7), x - 5, graficoY + graficoAltura + 7, { width: larguraBarra + 10, align: "center" });
        pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(6.5).text(moeda(valor), x - 10, Math.max(graficoY - 2, y - 10), { width: larguraBarra + 20, align: "center" });
      });
    } else {
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text("Sem histórico suficiente para exibir o gráfico.", 72, 697, { width: graficoLargura, align: "center" });
    }
    if (temGD2(fatura)) {
      pdf.fillColor("#8A5A00").font("Helvetica").fontSize(7.5).text(
        "GD II: custos obrigatórios da rede continuam na fatura da CEMIG; por isso o desconto final pode ser menor que o contratado.",
        48,
        775,
        { width: LARGURA, align: "center" }
      );
    }
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
