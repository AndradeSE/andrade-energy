import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import QRCode from "qrcode";
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
  resolve(process.cwd(), "../assets/images/andrade-fatura-logo.png"),
  resolve(process.cwd(), "assets/images/andrade-fatura-logo.png"),
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

function dataBrasileira(valor: unknown) {
  const texto = String(valor ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(texto);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto || "Não informado";
}

function textoCurto(valor: unknown, maximo = 56) {
  const texto = String(valor ?? "").trim();
  return texto.length > maximo ? `${texto.slice(0, Math.max(0, maximo - 1)).trim()}…` : texto;
}

function codigoDeBarrasDaLinhaDigitavel(valor: unknown) {
  const linha = String(valor ?? "").replace(/\D/g, "");
  if (linha.length === 44) return linha;
  if (linha.length === 47) {
    return `${linha.slice(0, 4)}${linha.slice(32, 33)}${linha.slice(33, 47)}${linha.slice(4, 9)}${linha.slice(10, 20)}${linha.slice(21, 31)}`;
  }
  if (linha.length === 48) {
    return `${linha.slice(0, 11)}${linha.slice(12, 23)}${linha.slice(24, 35)}${linha.slice(36, 47)}`;
  }
  return null;
}

function formatarLinhaDigitavel(valor: unknown) {
  return String(valor ?? "").replace(/\s+/g, "").trim();
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
  const codigoPix = String(fatura.codigo_pix ?? "").trim();
  const linhaDigitavel = formatarLinhaDigitavel(fatura.linha_digitavel);
  const codigoBarras = String(fatura.codigo_barras ?? "").replace(/\D/g, "") || codigoDeBarrasDaLinhaDigitavel(linhaDigitavel);
  const [imagemQrCode, imagemCodigoBarras] = await Promise.all([
    codigoPix
      ? QRCode.toBuffer(codigoPix, { type: "png", width: 240, margin: 1, errorCorrectionLevel: "M" }).catch(() => null)
      : Promise.resolve(null),
    codigoBarras
      ? bwipjs.toBuffer({ bcid: "interleaved2of5", text: codigoBarras, scale: 3, height: 12, includetext: false, padding: 0 }).catch(() => null)
      : Promise.resolve(null),
  ]);
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

    const valorCemigOriginal = numero(fatura.valor_cemig);
    const valorCemig = numero(fatura.valor_cemig_repassado ?? fatura.valor_cemig);
    const valorTotalAbsorvido = numero(fatura.valor_total_absorvido);
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

    const possuiGD2 = temGD2(fatura);
    const y = { cabecalho: 0, dados: 132, total: 272, aviso: 396, composicao: 438, inferior: 548, creditos: 692 };
    const verdeCabecalho = "#063C25";
    const desenharCartao = (x: number, top: number, largura: number, altura: number, fundo = "#FFFFFF") => {
      pdf.roundedRect(x, top, largura, altura, 7).fill(fundo);
      pdf.roundedRect(x, top, largura, altura, 7).strokeColor(BORDA).lineWidth(0.7).stroke();
    };

    // Cabeçalho compacto do modelo aprovado.
    pdf.rect(0, 0, 595, 116).fill(verdeCabecalho);
    // A arte oficial da primeira versão preserva o símbolo, tipografia e
    // espaçamento do logotipo no cabeçalho da fatura.
    const caminhoLogoFatura = CAMINHOS_LOGO.find((caminho) => caminho.includes("andrade-fatura-logo") && existsSync(caminho));
    if (caminhoLogoFatura) {
      pdf.image(caminhoLogoFatura, 30, 8, { fit: [210, 98] });
    } else {
      pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(23).text("ANDRADE", 54, 36);
      pdf.fillColor("#EAF6EF").font("Helvetica-Bold").fontSize(7.2).text("E N E R G Y", 86, 70);
    }
    const desenharCalendario = (x: number, top: number) => {
      pdf.roundedRect(x, top, 16, 15, 2).strokeColor("#FFC400").lineWidth(1.5).stroke();
      pdf.moveTo(x, top + 5).lineTo(x + 16, top + 5).stroke();
      pdf.moveTo(x + 4, top - 2).lineTo(x + 4, top + 3).stroke();
      pdf.moveTo(x + 12, top - 2).lineTo(x + 12, top + 3).stroke();
    };
    desenharCalendario(342, 45);
    desenharCalendario(462, 45);
    pdf.fillColor("#D8F0E3").font("Helvetica-Bold").fontSize(7).text("REFERÊNCIA", 365, 43);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text(fatura.referencia ?? "Não informada", 365, 55);
    pdf.strokeColor("#D8F0E3").lineWidth(0.7).moveTo(458, 38).lineTo(458, 76).stroke();
    pdf.fillColor("#D8F0E3").font("Helvetica-Bold").fontSize(7).text("VENCIMENTO", 480, 43);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text(dataBrasileira(fatura.vencimento), 480, 55);

    // Identificação do titular e da unidade.
    desenharCartao(38, y.dados - 8, 230, 112, "#FBF7EC");
    desenharCartao(288, y.dados - 8, 269, 112, "#F2F7F3");
    pdf.strokeColor(BORDA).lineWidth(0.7).moveTo(278, y.dados).lineTo(278, 255).stroke();
    pdf.circle(59, y.dados + 8, 7).fill(VERDE_ESCURO);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7).text("i", 57.4, y.dados + 4);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(7).text("DADOS DO TITULAR", 72, y.dados + 3);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(10).text(textoCurto(titular, 39).toUpperCase(), 48, y.dados + 22, { width: 210 });
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(8).text(textoCurto(endereco, 62), 48, y.dados + 43, { width: 210, lineGap: 3 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.3).text(documento ? `CPF ${documento}` : "CPF não informado", 48, y.dados + 78);
    pdf.circle(307, y.dados + 8, 7).fill(VERDE_ESCURO);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7).text("•", 305.5, y.dados + 4);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(7).text("UNIDADE CONSUMIDORA (UC)", 320, y.dados + 3);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.6).text(`UC: ${fatura.numero_instalacao ?? unidade.numero ?? "Não informada"}`, 298, y.dados + 22);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Classificação: ${unidade.classificacao ?? "Não informada"}`, 298, y.dados + 36);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Tensão: ${unidade.tensao ?? "Não informada"}`, 298, y.dados + 49);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Leitura atual: ${fatura.leitura_atual ?? "Não informada"}`, 298, y.dados + 62);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Leitura anterior: ${fatura.leitura_anterior ?? "Não informada"}`, 298, y.dados + 75);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(7.4).text(`Consumo faturado: ${energia(consumoKwh)}`, 298, y.dados + 89);

    // Painel principal: total domina, comparação fica secundária.
    desenharCartao(48, y.total, LARGURA, 112, "#F8FCF9");
    pdf.strokeColor(BORDA).moveTo(297, y.total + 20).lineTo(297, y.total + 95).stroke();
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("TOTAL A PAGAR", 67, y.total + 18);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(27).text(moeda(valorTotal), 67, y.total + 32);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.8).text(documentoUnificado ? "Valor referente à fatura unificada." : "Valor referente à Andrade Energy.", 67, y.total + 61);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("SEM ANDRADE ENERGY", 318, y.total + 18);
    pdf.fillColor("#73827C").font("Helvetica-Bold").fontSize(18).text(moeda(valorSemAndrade), 318, y.total + 32);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7).text(`Economia: ${moeda(economiaReal)}`, 318, y.total + 57);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.2).text(`Desconto contratado: ${percentual(descontoContratado)}`, 318, y.total + 68);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.2).text(`Desconto após impostos: ${percentual(descontoReal)}`, 318, y.total + 78);

    if (possuiGD2) {
      pdf.roundedRect(48, y.aviso, LARGURA, 22, 6).fill("#FFF7E7");
      pdf.roundedRect(48, y.aviso, LARGURA, 22, 6).strokeColor("#F0C36C").lineWidth(0.7).stroke();
      pdf.fillColor("#A36500").font("Helvetica-Bold").fontSize(6.7).text("GD II: custos obrigatórios da rede permanecem na conta da concessionária.", 64, y.aviso + 8, { width: 465, align: "center" });
    }

    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8.5).text(documentoUnificado ? "COMO CHEGAMOS AO TOTAL UNIFICADO" : "COMO CHEGAMOS À COBRANÇA", 48, y.composicao - 14);
    const rotuloCemig = valorTotalAbsorvido > 0
      ? `CEMIG DO CLIENTE\n(${moeda(valorCemigOriginal)} − ${moeda(valorTotalAbsorvido)})`
      : "CONTA DA\nCONCESSIONÁRIA";
    const cards = documentoUnificado
      ? [["1", rotuloCemig, moeda(valorCemig)], ["2", `ENERGIA ANDRADE\n(${energia(energiaCobrada)})`, moeda(valorUsina)], ["3", "TOTAL UNIFICADO", moeda(valorTotal)]]
      : [["1", "ENERGIA CONSIDERADA", energia(energiaCobrada)], ["2", "TARIFA ANDRADE", moeda(tarifaAndrade)], ["3", "TOTAL ANDRADE", moeda(valorTotal)]];
    cards.forEach(([ordem, titulo, valor], indice) => {
      const x = 48 + indice * 169;
      desenharCartao(x, y.composicao, 151, 78, indice === 1 ? "#F2F7F3" : "#FBFAF4");
      pdf.circle(x + 17, y.composicao + 17, 10).fill(VERDE_ESCURO);
      pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text(ordem, x + 14.5, y.composicao + 13);
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.4).text(titulo, x + 35, y.composicao + 13, { width: 104 });
      pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(12).text(valor, x + 20, y.composicao + 48, { width: 118, align: "right" });
      if (indice < 2) {
        pdf.circle(x + 160, y.composicao + 39, 10).fill("#D6EEE3");
        pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(13).text(indice === 0 ? "+" : "=", x + 156, y.composicao + 31);
      }
    });

    // Gráfico de economia e área de pagamento lado a lado.
    desenharCartao(48, y.inferior, 238, 143, "#FBFAF4");
    desenharCartao(305, y.inferior, 241, 143, "#F2F7F3");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("ECONOMIA MENSAL", 61, y.inferior + 12);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("PAGAMENTO", 318, y.inferior + 12);
    const ultimasEconomias: number[] = historicoEconomia.slice(-6).map((item: any): number => numero(item?.economia_real ?? item?.economia ?? item));
    const dadosGrafico = ultimasEconomias.some((valor: number) => valor > 0) ? ultimasEconomias : [0, 0, 0, 0, 0, economiaReal];
    const maiorEconomia = Math.max(1, ...dadosGrafico);
    const linhasGrafico = [0, 0.33, 0.66, 1];
    linhasGrafico.forEach((proporcao, indice) => {
      const linhaY = y.inferior + 101 - (proporcao * 56);
      const rotulo = moeda(maiorEconomia * proporcao).replace(",00", "");
      pdf.strokeColor("#E3ECE7").lineWidth(0.6).moveTo(82, linhaY).lineTo(267, linhaY).stroke();
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(5.5).text(rotulo, 60, linhaY - 3, { width: 18, align: "right" });
    });
    const meses = ["DEZ/24", "JAN/25", "FEV/25", "MAR/25", "ABR/25", "MAI/25"];
    dadosGrafico.forEach((valor: number, indice: number) => {
      const altura = valor > 0 ? Math.max(7, (valor / maiorEconomia) * 56) : 0;
      const x = 96 + indice * 29;
      if (altura > 0) pdf.roundedRect(x, y.inferior + 101 - altura, 14, altura, 2).fill(indice === dadosGrafico.length - 1 ? VERDE : "#4C9A62");
      if (valor > 0) pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(5.2).text(moeda(valor).replace("R$", ""), x - 7, y.inferior + 94 - altura, { width: 28, align: "center" });
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(5.2).text(meses[indice], x - 8, y.inferior + 108, { width: 30, align: "center" });
    });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(5.6).text("Evolução da economia nas últimas competências", 62, y.inferior + 125, { width: 210, align: "center" });
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(6.2).text("PAGUE COM PIX", 322, y.inferior + 28);
    pdf.roundedRect(322, y.inferior + 40, 70, 70, 3).fill("#FFFFFF");
    if (imagemQrCode) {
      pdf.image(imagemQrCode, 325, y.inferior + 43, { fit: [64, 64], align: "center", valign: "center" });
    } else {
      pdf.roundedRect(322, y.inferior + 40, 70, 70, 3).strokeColor("#9DB5AA").dash(2, { space: 2 }).stroke().undash();
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.4).text("PIX disponível\napós a emissão", 330, y.inferior + 65, { width: 54, align: "center" });
    }
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(6.2).text("BOLETO", 405, y.inferior + 28);
    if (imagemCodigoBarras) {
      pdf.image(imagemCodigoBarras, 405, y.inferior + 44, { fit: [126, 43], align: "center", valign: "center" });
      pdf.fillColor(TEXTO).font("Helvetica").fontSize(4.8).text(linhaDigitavel, 402, y.inferior + 92, { width: 132, align: "center" });
    } else {
      pdf.roundedRect(405, y.inferior + 44, 126, 48, 3).fill("#F6F8F7");
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(6.2).text("Código de barras disponível\napós a emissão", 414, y.inferior + 59, { width: 108, align: "center" });
    }
    pdf.roundedRect(318, y.inferior + 128, 215, 11, 4).fill("#E3F0E8");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica").fontSize(5.6).text("Após o vencimento, encargos poderão ser aplicados.", 327, y.inferior + 131);

    const miniCards = [["SALDO ATUAL\nDE CRÉDITOS", energia(saldoCreditos)], ["CRÉDITOS\nGERADOS (MÊS)", energia(energiaInjetada)], ["CRÉDITOS\nUSADOS (MÊS)", energia(energiaCompensada)], ["PRÓXIMA\nLEITURA", fatura.proxima_leitura ?? "A confirmar"]];
    const espacamentoMiniCards = 8;
    // Larguras inteiras evitam que o PDF arredonde cada coluna de forma diferente.
    const largurasMiniCards = [118, 118, 118, 120];
    let xMiniCard = 48;
    miniCards.forEach(([titulo, valor], indice) => {
      const larguraMiniCard = largurasMiniCards[indice];
      const x = xMiniCard;
      desenharCartao(x, y.creditos, larguraMiniCard, 66, indice % 2 === 0 ? "#F2F8F4" : "#FBF8EE");
      pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(6.2).text(titulo, x + 10, y.creditos + 10, {
        width: larguraMiniCard - 24,
        height: 24,
        lineGap: 1,
        align: "center",
      });
      pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8.5).text(valor, x + 7, y.creditos + 43, {
        width: larguraMiniCard - 14,
        height: 14,
        align: "center",
        lineBreak: false,
      });
      xMiniCard += larguraMiniCard + espacamentoMiniCards;
    });
    pdf.rect(48, 773, LARGURA, 14).fill("#EFF6F1");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica").fontSize(5.8).text("Você escolhe economia. O planeta agradece.    |    Atendimento Andrade Energy", 61, 777, { width: 470, align: "center" });
    pdf.end();
  });
}

async function enviarPdf(caminho: string, conteudo: Buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, {
    contentType: "application/pdf",
    cacheControl: "0",
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
  // Um caminho novo evita que o CDN ou o leitor do aparelho reutilize uma
  // versão anterior depois que valores da fatura forem recalculados.
  const versao = Date.now();
  const [pdfUsina, pdfUnificada] = await Promise.all([
    gerarPdfFatura(fatura, "USINA"),
    gerarPdfFatura(fatura, "UNIFICADA"),
  ]);
  const [usina, unificada] = await Promise.all([
    enviarPdf(`${pasta}/fatura-usina-${versao}.pdf`, pdfUsina),
    enviarPdf(`${pasta}/fatura-unificada-${versao}.pdf`, pdfUnificada),
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
  if (/^https?:\/\//i.test(caminho)) return caminho;
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
