import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { supabase } from "../../config/supabase";
import { extrairTextoDoBuffer } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";

const BUCKET = "faturas";
const VERDE = "#107C5C";
const VERDE_ESCURO = "#07533D";
const VERDE_CLARO = "#E8F6F0";
const TEXTO = "#17312A";
const TEXTO_SECUNDARIO = "#5C6B65";
const BORDA = "#D8E7E0";
const LARGURA = 498;
const CAMINHOS_LOGO = [
  // Local e Render: o serviço é iniciado dentro de backend/ e os assets
  // ficam na raiz do repositório.
  resolve(process.cwd(), "../assets/images/andrade-logo-horizontal.png"),
  resolve(process.cwd(), "assets/images/andrade-logo-horizontal.png"),
];
const CAMINHO_LOGO = CAMINHOS_LOGO.find(existsSync);

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
      .limit(8);
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
    historico_economia: historicoComAtual.slice(0, 8).reverse(),
  };
}

/**
 * A conta original CEMIG é a fonte de verdade dos dados impressos. Ao
 * regenerar uma fatura antiga, relê o PDF arquivado para não depender de
 * campos que possam ter sido alterados depois no cadastro do aplicativo.
 */
async function obterDadosDaContaCemigOriginal(fatura: any, cliente: any, unidade: any) {
  const caminho = String(fatura.pdf_cemig_url ?? "").trim();
  if (!caminho || /^https?:\/\//i.test(caminho)) return null;

  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
    if (error || !data) return null;
    const documento = String(unidade?.cpf_titular ?? cliente?.cpf ?? "").replace(/\D/g, "");
    const texto = await extrairTextoDoBuffer(
      Buffer.from(await data.arrayBuffer()),
      documento.length >= 4 ? documento.slice(0, 4) : undefined
    );
    return interpretarFatura(texto);
  } catch {
    // Há contas antigas protegidas ou digitalizadas que não possuem texto.
    // Nesses casos a fatura continua usando os dados do cadastro.
    return null;
  }
}

/** Gera a fatura que o cliente recebe e pode baixar no aplicativo. */
export async function gerarPdfFatura(fatura: any, tipo: "USINA" | "UNIFICADA") {
  fatura = await incluirDadosDaUCNaFatura(fatura);
  const clienteDaFatura = fatura.clientes ?? {};
  const unidadeDaFatura = fatura.unidades_consumidoras ?? {};
  const dadosCemigDaFatura = await obterDadosDaContaCemigOriginal(fatura, clienteDaFatura, unidadeDaFatura);
  fatura = { ...fatura, dados_cemig: dadosCemigDaFatura };
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
    const dadosCemig = fatura.dados_cemig ?? {};
    // Mantemos na Andrade os mesmos dados que identificam a conta CEMIG:
    // titular, documento, UC, concessionária e endereço da unidade.
    const titular = dadosCemig.cliente ?? unidade.titular ?? cliente.nome ?? "Cliente não informado";
    const documento = dadosCemig.cpf ?? unidade.cpf_titular ?? cliente.cpf ?? null;
    const endereco = dadosCemig.endereco ?? unidade.endereco ?? cliente.endereco ?? "Endereço não informado";
    const historicoEconomia = Array.isArray(fatura.historico_economia) ? fatura.historico_economia : [];
    const economiaAcumulada = historicoEconomia.reduce(
      (total: number, item: any) => total + numero(item.economia_real ?? item.economia),
      0
    );
    const tarifaGD1 = numero(dadosCemig.tarifaGD1);
    const tarifaGD2 = numero(dadosCemig.tarifaGD2);
    const energiaGD1 = numero(dadosCemig.energiaCompensadaGD1);
    const energiaGD2 = numero(dadosCemig.energiaCompensadaGD2);
    const tarifaOuIndisponivel = (valor: number) => valor > 0 ? `${moeda(valor)}/kWh` : "—";

    pdf.rect(0, 0, 595, 145).fill(VERDE_ESCURO);
    // Marca ampliada: a fatura precisa ser imediatamente reconhecível pelo
    // cliente, inclusive quando o PDF é encaminhado fora do aplicativo.
    pdf.roundedRect(48, 15, 190, 52, 10).fill("#FFFFFF");
    if (CAMINHO_LOGO) {
      pdf.image(CAMINHO_LOGO, 58, 20, { fit: [170, 42], align: "center", valign: "center" });
    } else {
      pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(17).text("Andrade Energy", 60, 33, { width: 166, align: "center" });
    }
    pdf.fillColor("#D4F0E5").font("Helvetica-Bold").fontSize(10.5).text(tipo === "UNIFICADA" ? "FATURA UNIFICADA DE ENERGIA" : "COBRANÇA DE ENERGIA SOLAR", 252, 21, { width: 294, align: "right" });
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8.5).text(`Referência: ${fatura.referencia ?? "Não informada"}`, 252, 42, { width: 294, align: "right" });
    pdf.fillColor("#D4F0E5").font("Helvetica").fontSize(8).text(`Vencimento: ${fatura.vencimento ?? "Não informado"}`, 252, 57, { width: 294, align: "right" });
    pdf.strokeColor("#7FAE9E").lineWidth(0.7).moveTo(48, 76).lineTo(546, 76).stroke();
    // Mantém o card cadastral original. Ele só foi compactado para conviver
    // com a marca no próprio cabeçalho, sem perder nenhuma informação.
    pdf.roundedRect(48, 82, LARGURA, 54, 9).fill("#F8FBF9").strokeColor(BORDA).stroke();
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.5).text("TITULAR DA CONTA", 62, 91);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(9).text(textoCurto(titular, 39), 62, 101, { width: 260 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.8).text(documento ? `CPF/CNPJ: ${documento}` : "CPF/CNPJ não informado", 62, 114, { width: 260 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.5).text(textoCurto(endereco, 63), 62, 124, { width: 260 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.5).text("DADOS DA UNIDADE", 336, 91, { width: 194, align: "right" });
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(9).text(`UC ${dadosCemig.uc ?? fatura.numero_instalacao ?? unidade.numero ?? "Não informada"}`, 336, 101, { width: 194, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.8).text(`${dadosCemig.distribuidora ?? unidade.distribuidora ?? fatura.distribuidora ?? "Concessionária"} · ${String(fatura.modalidade_faturamento ?? "COMPENSACAO").toLowerCase() === "injecao" ? "Injeção" : "Compensação"}`, 336, 114, { width: 194, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.5).text(textoCurto(endereco, 42), 336, 124, { width: 194, align: "right" });

    // Quadro técnico inspirado na leitura da conta da CEMIG: consumo,
    // energia compensada/injetada e créditos aparecem separados dos valores.
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Energia e créditos", 48, 164);
    pdf.roundedRect(48, 181, LARGURA, 67, 10).fill("#F8FBF9").strokeColor(BORDA).stroke();
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
      const y = 193 + linha * 26;
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7.5).text(rotulo, x, y, { width: 210 });
      pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(9.5).text(valor, x, y + 10, { width: 210 });
    });

    pdf.roundedRect(48, 264, LARGURA, 68, 12).fill(VERDE_CLARO);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8.5).text("TOTAL A PAGAR NESTE MÊS", 66, 280);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(20).text(moeda(valorTotal), 66, 295);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text("CEMIG + energia solar Andrade Energy", 66, 317);
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(8.5).text("SUA ECONOMIA REAL", 344, 280, { width: 170, align: "right" });
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(15).text(moeda(economiaReal), 344, 295, { width: 170, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(`Desconto final real: ${percentual(descontoReal)}`, 344, 317, { width: 170, align: "right" });

    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Resumo da cobrança", 48, 352);
    pdf.roundedRect(48, 369, LARGURA, 79, 10).fill("#FFFFFF").strokeColor(BORDA).stroke();
    // Referência de comparação: quanto a conta custaria sem a Andrade.
    pdf.roundedRect(60, 377, 474, 25, 6).fill("#FFF7E6");
    pdf.fillColor("#765100").font("Helvetica-Bold").fontSize(7.2).text("VALOR ORIGINAL SEM ANDRADE ENERGY", 68, 384, { width: 265 });
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(14).text(moeda(valorSemAndrade), 362, 382, { width: 158, align: "right" });
    desenharLinha(pdf, 407);
    desenharLinhaDeValor(pdf, 415, "Você paga neste mês", moeda(valorTotal), true);
    desenharLinha(pdf, 427);
    desenharLinhaDeValor(pdf, 435, "Economia real no mês", moeda(economiaReal), true);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(`Desconto contratado: ${percentual(descontoContratado)}  |  Desconto final real: ${percentual(descontoReal)}`, 64, 447, { width: 465, align: "center" });

    // Tabela tarifária resumida da fatura original: mostra somente itens que
    // ajudam o consumidor a entender sua cobrança, sem replicar a conta toda.
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10.5).text("Tabela tarifária da conta da concessionária", 48, 467);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text("Dados lidos da fatura original", 48, 480);
    pdf.roundedRect(48, 494, LARGURA, 94, 10).fill("#F8FBF9").strokeColor(BORDA).stroke();
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.5).text("ITEM", 62, 504, { width: 188 });
    pdf.text("QUANTIDADE", 262, 504, { width: 76, align: "right" });
    pdf.text("TARIFA", 351, 504, { width: 80, align: "right" });
    pdf.text("VALOR / INFORMAÇÃO", 442, 504, { width: 88, align: "right" });
    pdf.strokeColor(BORDA).lineWidth(0.6).moveTo(62, 516).lineTo(530, 516).stroke();
    const linhasTarifarias = [
      ["Energia consumida", energia(consumoKwh), tarifaOuIndisponivel(tarifaCemig), `Base: ${energia(energiaCobrada)}`],
      [energiaGD1 > 0 ? "Energia compensada GD1" : "Energia compensada", energia(energiaGD1 || energiaCompensada), tarifaOuIndisponivel(tarifaGD1 || numero(fatura.tarifa_gd)), "Crédito utilizado"],
      [energiaGD2 > 0 ? "Energia compensada GD2" : "Custo de disponibilidade", energiaGD2 > 0 ? energia(energiaGD2) : "—", energiaGD2 > 0 ? tarifaOuIndisponivel(tarifaGD2) : "—", energiaGD2 > 0 ? "Crédito utilizado" : moeda(numero(fatura.custo_disponibilidade ?? dadosCemig.custoDisponibilidade))],
      [energiaGD2 > 0 ? "Custo de disponibilidade" : "Total da conta", energiaGD2 > 0 ? "—" : "—", "—", energiaGD2 > 0 ? moeda(numero(fatura.custo_disponibilidade ?? dadosCemig.custoDisponibilidade)) : moeda(valorCemig)],
      [energiaGD2 > 0 ? "Total da conta" : "Energia solar Andrade", "—", energiaGD2 > 0 ? "—" : tarifaOuIndisponivel(tarifaAndrade), energiaGD2 > 0 ? moeda(valorCemig) : moeda(valorUsina)],
    ];
    linhasTarifarias.forEach(([item, quantidade, tarifa, valor], indice) => {
      const y = 522 + indice * 12;
      pdf.fillColor(indice === linhasTarifarias.length - 1 ? VERDE_ESCURO : TEXTO).font(indice === linhasTarifarias.length - 1 ? "Helvetica-Bold" : "Helvetica").fontSize(7.2).text(item, 62, y, { width: 188 });
      pdf.text(quantidade, 262, y, { width: 76, align: "right" });
      pdf.text(tarifa, 351, y, { width: 80, align: "right" });
      pdf.text(valor, 442, y, { width: 88, align: "right" });
    });

    // Gráfico enxuto: permite conferir mês a mês a economia sem transformar
    // a fatura em uma segunda página.
    // Resumo intencionalmente discreto: preserva a informação e deixa a área
    // inferior livre para o QR Code Pix e a linha/código de barras do boleto.
    pdf.roundedRect(48, 601, LARGURA, 36, 9).fill("#F8FBF9").strokeColor(BORDA).stroke();
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7).text("ECONOMIA ACUMULADA", 64, 613);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(12).text(moeda(economiaAcumulada), 64, 622);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(
      historicoEconomia.length ? `${historicoEconomia.length} competências consideradas` : "Histórico será exibido nas próximas faturas",
      294,
      619,
      { width: 220, align: "right" }
    );
    if (temGD2(fatura)) {
      pdf.fillColor("#8A5A00").font("Helvetica").fontSize(7.5).text(
        "GD II: custos obrigatórios da rede continuam na fatura da CEMIG; por isso o desconto final pode ser menor que o contratado.",
        48,
        652,
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
