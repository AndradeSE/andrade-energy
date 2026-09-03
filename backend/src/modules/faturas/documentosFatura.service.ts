import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import QRCode from "qrcode";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { supabase } from "../../config/supabase";
import { extrairTextoDoBuffer } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";

const BUCKET = "faturas";
export const VERSAO_LAYOUT_FATURA = "layout-20260903-v4";
export const VERSAO_RELATORIO_CALCULO = "relatorio-calculo-20260903-v2";
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

function tarifaKwh(valor: unknown) {
  return `${numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })}/kWh`;
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

function pontoPolar(cx: number, cy: number, raio: number, angulo: number) {
  const radianos = ((angulo - 90) * Math.PI) / 180;
  return { x: cx + raio * Math.cos(radianos), y: cy + raio * Math.sin(radianos) };
}

function caminhoRosca(cx: number, cy: number, raioExterno: number, raioInterno: number, inicio: number, fim: number) {
  const externoInicio = pontoPolar(cx, cy, raioExterno, fim);
  const externoFim = pontoPolar(cx, cy, raioExterno, inicio);
  const internoInicio = pontoPolar(cx, cy, raioInterno, inicio);
  const internoFim = pontoPolar(cx, cy, raioInterno, fim);
  const arcoGrande = fim - inicio <= 180 ? 0 : 1;
  return `M ${externoInicio.x} ${externoInicio.y} A ${raioExterno} ${raioExterno} 0 ${arcoGrande} 0 ${externoFim.x} ${externoFim.y} L ${internoInicio.x} ${internoInicio.y} A ${raioInterno} ${raioInterno} 0 ${arcoGrande} 1 ${internoFim.x} ${internoFim.y} Z`;
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

async function preencherDadosTecnicosDaContaOriginal(fatura: any) {
  if (fatura.leitura_anterior != null && fatura.leitura_atual != null && fatura.classificacao && fatura.tensao) return fatura;
  const origem = String(fatura.pdf_cemig_url ?? "").trim();
  if (!origem) return fatura;

  try {
    let buffer: Buffer;
    if (/^https?:\/\//i.test(origem)) {
      const resposta = await fetch(origem);
      if (!resposta.ok) return fatura;
      buffer = Buffer.from(await resposta.arrayBuffer());
    } else {
      const { data, error } = await supabase.storage.from(BUCKET).download(origem);
      if (error || !data) return fatura;
      buffer = Buffer.from(await data.arrayBuffer());
    }
    const extraida = interpretarFatura(await extrairTextoDoBuffer(buffer));
    const tecnicos = {
      leitura_anterior: fatura.leitura_anterior ?? extraida.leituraAnterior ?? null,
      leitura_atual: fatura.leitura_atual ?? extraida.leituraAtual ?? null,
      fator_multiplicacao: fatura.fator_multiplicacao ?? extraida.fatorMultiplicacao ?? 1,
      tensao: fatura.tensao || extraida.tensao || null,
      classificacao: fatura.classificacao || extraida.classificacao || null,
      tipo_ligacao: fatura.tipo_ligacao || extraida.tipoLigacao || null,
      valor_iluminacao_publica: numero(fatura.valor_iluminacao_publica) || extraida.valorIluminacaoPublica || 0,
      valor_bandeira: numero(fatura.valor_bandeira) || extraida.valorBandeira || 0,
      valor_impostos: numero(fatura.valor_impostos) || extraida.valorImpostos || 0,
    };
    if (fatura.id) await supabase.from("faturas").update(tecnicos).eq("id", fatura.id);
    return {
      ...fatura,
      ...tecnicos,
      proxima_leitura: fatura.proxima_leitura ?? extraida.proximaLeitura ?? null,
    };
  } catch {
    return fatura;
  }
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
    // O valor de referência energética é usado internamente para calcular o
    // desconto real, sem cobranças extraordinárias. Já o comparativo exibido
    // como "com impostos" precisa reconstruir a conta final do consumidor:
    // total unificado + economia obtida. Não reutilize aqui a base energética
    // antiga, pois ela omite os componentes tributados da conta final.
    const valorSemAndrade = documentoUnificado
      ? Math.max(0, valorTotal + economiaReal)
      : numero(fatura.valor_energia_cheia) || Math.max(0, valorTotal + economiaReal);
    const descontoContratado = numero(fatura.desconto_contratado_percentual ?? fatura.desconto_percentual);
    const descontoReal = numero(fatura.desconto_real_percentual);
    const consumoKwh = numero(fatura.consumo_kwh ?? fatura.consumo);
    const energiaInjetada = numero(fatura.energia_injetada);
    const energiaCompensada = numero(fatura.energia_compensada);
    const saldoCreditos = numero(fatura.saldo_atual);
    const energiaCobrada = numero(fatura.base_calculo_kwh ?? fatura.energia_compensada ?? fatura.consumo_kwh ?? fatura.consumo);
    const tarifaCheia = numero(fatura.tarifa_cheia) || (energiaCobrada > 0 ? numero(fatura.valor_energia_cheia) / energiaCobrada : 0);
    const tarifaAndrade = numero(fatura.tarifa_andrade) || (energiaCobrada > 0 ? valorUsina / energiaCobrada : 0);
    const cliente = fatura.clientes ?? {};
    const unidade = fatura.unidades_consumidoras ?? {};
    // Mantemos na Andrade os mesmos dados que identificam a conta CEMIG:
    // titular, documento, UC, concessionária e endereço da unidade.
    const titular = unidade.titular ?? cliente.nome ?? "Cliente não informado";
    const documento = unidade.cpf_titular ?? cliente.cpf ?? null;
    const endereco = unidade.endereco ?? cliente.endereco ?? "Endereço não informado";
    const possuiGD2 = temGD2(fatura);
    const disponibilidadeComposicao = numero(fatura.custo_disponibilidade_repassado) || (!energiaCompensada ? numero(fatura.custo_disponibilidade) : 0);
    const fioBComposicao = numero(fatura.diferenca_fio_b_repassada);
    const iluminacaoPublica = numero(fatura.valor_iluminacao_publica);
    const bandeiraComposicao = numero(fatura.valor_bandeira);
    const valorCemigComposicao = Math.max(0, valorCemig);
    const custosIdentificados = disponibilidadeComposicao + fioBComposicao + iluminacaoPublica + bandeiraComposicao;
    const impostosLidos = numero(fatura.valor_impostos);
    const impostos = impostosLidos > valorCemigComposicao * 0.55
      ? 0
      : Math.min(impostosLidos, Math.max(0, valorCemigComposicao - custosIdentificados));
    const energiaEEncargos = Math.max(0, valorCemigComposicao - custosIdentificados - impostos);
    const composicaoTarifaria = [
      { rotulo: "Energia da usina", valor: valorUsina, cor: VERDE, complemento: energia(energiaCobrada) },
      { rotulo: "Energia e encargos", valor: energiaEEncargos, cor: "#0EA5B7", complemento: null },
      { rotulo: "Disponibilidade", valor: disponibilidadeComposicao, cor: "#F59E0B", complemento: null },
      { rotulo: "Fio B", valor: fioBComposicao, cor: "#376BC7", complemento: null },
      { rotulo: "Iluminação pública", valor: iluminacaoPublica, cor: "#8B5CF6", complemento: null },
      { rotulo: "Bandeira tarifária", valor: bandeiraComposicao, cor: "#E65A17", complemento: null },
      { rotulo: "Impostos", valor: impostos, cor: "#D94B22", complemento: null },
    ].filter((item) => item.valor > 0);
    const totalComposicao = composicaoTarifaria.reduce((soma, item) => soma + item.valor, 0);
    const rotuloCentroGrafico = documentoUnificado ? "FATURA UNIFICADA" : "FATURA ANDRADE";
    const valorCentroGrafico = documentoUnificado ? valorTotal : valorUsina;
    const y = { cabecalho: 0, dados: 132, total: 272, aviso: 396, composicao: 454, inferior: 564, creditos: 708 };
    const verdeCabecalho = "#063C25";
    const desenharCartao = (x: number, top: number, largura: number, altura: number, fundo = "#FFFFFF") => {
      pdf.roundedRect(x, top, largura, altura, 7).fill(fundo);
      pdf.roundedRect(x, top, largura, altura, 7).strokeColor(BORDA).lineWidth(0.7).stroke();
    };

    // Cabeçalho compacto do modelo aprovado.
    pdf.rect(0, 0, 595, 842).fill("#E9F1ED");
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
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Classificação: ${fatura.classificacao ?? unidade.classificacao ?? "Não informada"}`, 298, y.dados + 36);
    const tensao = fatura.tensao ?? unidade.tensao;
    const tipoLigacao = String(fatura.tipo_ligacao ?? "").toLowerCase();
    const ligacao = tipoLigacao ? `${tipoLigacao.charAt(0).toUpperCase()}${tipoLigacao.slice(1)}` : "Não informada";
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(tensao ? `Tensão: ${tensao}` : `Ligação: ${ligacao}`, 298, y.dados + 49);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Leitura atual: ${fatura.leitura_atual ?? "Não informada"}`, 298, y.dados + 62);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(7.4).text(`Leitura anterior: ${fatura.leitura_anterior ?? "Não informada"}`, 298, y.dados + 75);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(7.4).text(`Consumo faturado: ${energia(consumoKwh)}`, 298, y.dados + 89);

    // Painel principal: total domina, comparação fica secundária.
    desenharCartao(48, y.total, LARGURA, 112, VERDE_ESCURO);
    pdf.strokeColor("#4D8A76").moveTo(297, y.total + 20).lineTo(297, y.total + 95).stroke();
    pdf.fillColor("#F6CC32").font("Helvetica-Bold").fontSize(8.5).text("TOTAL A PAGAR", 67, y.total + 17);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(29).text(moeda(valorTotal), 67, y.total + 31);
    pdf.fillColor("#D8EEE6").font("Helvetica").fontSize(6.8).text(documentoUnificado ? "Fatura Unificada Andrade Energy." : "Valor referente à Andrade Energy.", 67, y.total + 66);
    pdf.fillColor("#F6CC32").font("Helvetica-Bold").fontSize(6.1).text(`kWh cheio: ${tarifaKwh(tarifaCheia)}`, 67, y.total + 82);
    pdf.fillColor("#D8EEE6").font("Helvetica-Bold").fontSize(6.1).text(`kWh Andrade: ${tarifaKwh(tarifaAndrade)}`, 172, y.total + 82);
    pdf.fillOpacity(0.09).roundedRect(310, y.total + 12, 221, 88, 7).fill("#FFFFFF").fillOpacity(1);
    pdf.fillColor("#D8EEE6").font("Helvetica-Bold").fontSize(8).text("SEM ANDRADE ENERGY · COM IMPOSTOS", 326, y.total + 19);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(moeda(valorSemAndrade), 326, y.total + 33);
    pdf.fillColor("#F6CC32").font("Helvetica-Bold").fontSize(7).text(`Economia: ${moeda(economiaReal)}`, 326, y.total + 58);
    pdf.fillColor("#D8EEE6").font("Helvetica").fontSize(6.2).text(`Desconto contratado: ${percentual(descontoContratado)}`, 326, y.total + 69);
    pdf.fillColor("#D8EEE6").font("Helvetica-Bold").fontSize(6.2).text(`Desconto após impostos: ${percentual(descontoReal)}`, 326, y.total + 79);

    pdf.roundedRect(48, y.aviso, LARGURA, 36, 6).fill("#FFF7E7");
    pdf.roundedRect(48, y.aviso, LARGURA, 36, 6).strokeColor("#F0C36C").lineWidth(0.7).stroke();
    const avisoCustos = faturaSomenteAndrade
      ? "ATENÇÃO: esta cobrança não inclui a conta da concessionária. Ela também deve ser paga separadamente."
      : possuiGD2
        ? "GD II: custos obrigatórios da rede permanecem na conta da concessionária."
        : "Custos obrigatórios da rede permanecem na conta da concessionária.";
    pdf.fillColor("#A36500").font("Helvetica-Bold").fontSize(6.1).text(avisoCustos, 64, y.aviso + 6, { width: 465, align: "center", lineGap: 1 });
    pdf.fillColor("#855B18").font("Helvetica").fontSize(5.6).text("Multas, iluminação pública, bandeiras e encargos extraordinários não são considerados para mensurar o desconto real.", 64, y.aviso + 20, { width: 465, align: "center", lineGap: 1 });

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

    // Composição da cobrança e área de pagamento lado a lado.
    desenharCartao(48, y.inferior, 238, 143, "#F7F1DF");
    desenharCartao(305, y.inferior, 241, 143, "#F2F7F3");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("COMPOSIÇÃO DA FATURA", 61, y.inferior + 12);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("PAGAMENTO", 318, y.inferior + 12);
    if (totalComposicao > 0) {
      let angulo = 0;
      composicaoTarifaria.forEach((item) => {
        const abertura = (item.valor / totalComposicao) * 360;
        const separacao = abertura > 5 ? 1.5 : 0;
        pdf.path(caminhoRosca(111, y.inferior + 81, 45, 28, angulo + separacao, angulo + abertura - separacao)).fill(item.cor);
        angulo += abertura;
      });
    }
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(4.5).text(rotuloCentroGrafico, 72, y.inferior + 72, { width: 78, align: "center" });
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(7.5).text(moeda(valorCentroGrafico), 69, y.inferior + 82, { width: 84, align: "center" });
    composicaoTarifaria.forEach((item, indice) => {
      const top = y.inferior + 28 + indice * 14;
      const proporcao = totalComposicao > 0 ? item.valor / totalComposicao * 100 : 0;
      pdf.roundedRect(166, top + 1, 7, 11, 2).fill(item.cor);
      pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(4.8).text(item.rotulo, 179, top, { width: 91 });
      pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(5.2).text(`${item.complemento ? `${item.complemento} · ` : ""}${moeda(item.valor)}`, 179, top + 6.5, { width: 89 });
      pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(4.3).text(percentual(proporcao), 242, top + 1, { width: 29, align: "right" });
    });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(4.5).text("Tributos podem estar embutidos nas tarifas; percentuais consideram os itens detalhados.", 61, y.inferior + 130, { width: 210, align: "center" });
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

    const miniCards = [["SALDO ATUAL\nDE CRÉDITOS", energia(saldoCreditos)], ["CRÉDITOS\nGERADOS (MÊS)", energia(energiaInjetada)], ["CRÉDITOS\nUSADOS (MÊS)", energia(energiaCompensada)], ["PRÓXIMA\nLEITURA", fatura.proxima_leitura ? dataBrasileira(fatura.proxima_leitura) : "A confirmar"]];
    const espacamentoMiniCards = 8;
    // Cada dupla acompanha exatamente os limites dos dois cards superiores.
    const posicoesMiniCards = [
      { x: 48, largura: 115 },
      { x: 48 + 115 + espacamentoMiniCards, largura: 115 },
      { x: 305, largura: 116.5 },
      { x: 305 + 116.5 + espacamentoMiniCards, largura: 116.5 },
    ];
    miniCards.forEach(([titulo, valor], indice) => {
      const { x, largura: larguraMiniCard } = posicoesMiniCards[indice];
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
    });
    pdf.rect(48, 773, LARGURA, 14).fill("#EFF6F1");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica").fontSize(5.8).text("Você escolhe economia. O planeta agradece.    |    Atendimento Andrade Energy", 61, 777, { width: 470, align: "center" });

    pdf.end();
  });
}

/**
 * Memória de cálculo entregue junto da fatura. O documento usa somente os
 * valores efetivamente persistidos no faturamento, para que cliente e gestor
 * consigam reproduzir o total sem depender de estimativas da interface.
 */
export async function gerarPdfRelatorioCalculo(fatura: any) {
  fatura = await incluirDadosDaUCNaFatura(await preencherDadosTecnicosDaContaOriginal(fatura));
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margins: { top: 42, right: 48, bottom: 42, left: 48 },
      info: { Title: `Memória de cálculo - ${fatura.referencia ?? "fatura"}` },
    });
    const partes: Buffer[] = [];
    pdf.on("data", (parte) => partes.push(parte));
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.on("error", reject);

    const cliente = fatura.clientes ?? {};
    const unidade = fatura.unidades_consumidoras ?? {};
    const modalidade = String(fatura.modalidade_faturamento ?? "COMPENSACAO").toUpperCase();
    const gd = temGD2(fatura) ? "GD II" : "GD I";
    const somenteAndrade = Boolean(fatura.fatura_somente_andrade);
    const energiaBase = numero(fatura.base_calculo_kwh ?? (modalidade === "INJECAO" ? fatura.energia_injetada : fatura.energia_compensada));
    const tarifaCheia = numero(fatura.tarifa_cheia);
    const tarifaAndrade = numero(fatura.tarifa_andrade) || tarifaCheia * (1 - numero(fatura.desconto_contratado_percentual ?? fatura.desconto_percentual) / 100);
    const valorEnergiaCheia = numero(fatura.valor_energia_cheia) || energiaBase * tarifaCheia;
    const valorAndradeBruto = energiaBase * tarifaAndrade;
    const disponibilidade = numero(fatura.custo_disponibilidade);
    const disponibilidadeRepassada = numero(fatura.custo_disponibilidade_repassado);
    const disponibilidadeAbsorvida = numero(fatura.valor_absorvido_disponibilidade);
    const fioB = numero(fatura.diferenca_fio_b);
    const fioBRepassado = numero(fatura.diferenca_fio_b_repassada);
    const fioBAbsorvido = numero(fatura.valor_absorvido_fio_b);
    const valorAndrade = numero(fatura.valor_usina ?? fatura.valor_andrade);
    const valorCemigOriginal = numero(fatura.valor_cemig);
    const valorCemigRepassado = numero(fatura.valor_cemig_repassado ?? fatura.valor_cemig);
    const totalUnificado = numero(fatura.valor_total_unificado ?? fatura.valor_total);
    const economia = numero(fatura.economia_real ?? fatura.economia);
    // Na fatura unificada, a referência exibida deve conter todos os tributos
    // efetivamente considerados no fechamento: total pago + economia obtida.
    // O campo legado valor_referencia_sem_andrade guarda apenas a energia em
    // algumas faturas antigas e, por isso, não serve para este demonstrativo.
    const referenciaSemAndrade = somenteAndrade
      ? numero(fatura.valor_referencia_sem_andrade) || totalUnificado + economia
      : totalUnificado + economia;
    const descontoReal = numero(fatura.desconto_real_percentual);
    const descontoContratado = numero(fatura.desconto_contratado_percentual ?? fatura.desconto_percentual);
    const impostos = numero(fatura.valor_impostos);

    const cartao = (x: number, y: number, largura: number, altura: number, fundo = "#FFFFFF") => {
      pdf.roundedRect(x, y, largura, altura, 7).fill(fundo);
      pdf.roundedRect(x, y, largura, altura, 7).strokeColor(BORDA).lineWidth(0.7).stroke();
    };
    const linha = (rotulo: string, valor: string, y: number, destaque = false) => {
      const tamanhoRotulo = rotulo.length > 48 ? 7.2 : rotulo.length > 38 ? 8 : 9;
      const tamanhoValor = valor.length > 58 ? 6.2 : valor.length > 42 ? 7 : valor.length > 28 ? 8 : destaque ? 10 : 9;
      pdf.fillColor(destaque ? VERDE_ESCURO : TEXTO_SECUNDARIO).font(destaque ? "Helvetica-Bold" : "Helvetica").fontSize(tamanhoRotulo).text(rotulo, 62, y, { width: 286, height: 14, ellipsis: true });
      pdf.fillColor(destaque ? VERDE_ESCURO : TEXTO).font(destaque ? "Helvetica-Bold" : "Helvetica").fontSize(tamanhoValor).text(valor, 350, y, { width: 178, height: 14, align: "right", ellipsis: true });
    };

    pdf.rect(0, 0, 595, 842).fill("#F3F7F5");
    pdf.rect(0, 0, 595, 112).fill("#063C25");
    desenharLogoNoCabecalho(pdf);
    pdf.fillColor("#F6CC32").font("Helvetica-Bold").fontSize(8).text("MEMÓRIA DE CÁLCULO", 335, 34, { width: 205, align: "right" });
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(`Faturamento ${fatura.referencia ?? ""}`, 300, 50, { width: 240, align: "right" });
    pdf.fillColor("#D8EEE6").font("Helvetica").fontSize(8).text(`${gd} · ${modalidade === "INJECAO" ? "Injeção" : "Compensação"} · ${somenteAndrade ? "Somente Andrade" : "Fatura unificada"}`, 270, 78, { width: 270, align: "right" });

    cartao(48, 128, 498, 72, "#FFFFFF");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(8).text("IDENTIFICAÇÃO", 62, 143);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(11).text(cliente.nome ?? unidade.titular ?? "Cliente não informado", 62, 158, { width: 280 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`UC ${fatura.numero_instalacao ?? unidade.numero ?? "-"} · CPF ${unidade.cpf_titular ?? cliente.cpf ?? "não informado"}`, 62, 177);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`Vencimento ${dataBrasileira(fatura.vencimento)}`, 390, 158, { width: 138, align: "right" });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(8).text(`Emissão ${dataBrasileira(fatura.data_emissao ?? fatura.created_at)}`, 390, 175, { width: 138, align: "right" });

    cartao(48, 216, 498, 112, "#E8F6F0");
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(9).text("RESULTADO DO FATURAMENTO", 62, 232);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(25).text(moeda(totalUnificado), 62, 250);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(somenteAndrade ? "Cobrança Andrade Energy; a concessionária permanece separada." : "Total da fatura unificada Andrade Energy.", 62, 281, { width: 235, height: 22, ellipsis: true });
    pdf.strokeColor("#A9CFC0").moveTo(318, 234).lineTo(318, 310).stroke();
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica-Bold").fontSize(7).text("SEM ANDRADE ENERGY", 340, 238);
    pdf.fillColor(TEXTO).font("Helvetica-Bold").fontSize(16).text(moeda(referenciaSemAndrade), 340, 252);
    pdf.fillColor(VERDE).font("Helvetica-Bold").fontSize(9).text(`Economia ${moeda(economia)}`, 340, 278);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7.5).text(`Contratado ${percentual(descontoContratado)} · Real ${percentual(descontoReal)}`, 340, 296, { width: 188, height: 12, ellipsis: true });

    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(10).text("1. BASE DE ENERGIA", 48, 352);
    cartao(48, 370, 498, 116, "#FFFFFF");
    linha(modalidade === "INJECAO" ? "Energia injetada faturada" : "Energia compensada faturada", energia(energiaBase), 389, true);
    linha("Tarifa cheia da concessionária (tributos incluídos)", tarifaKwh(tarifaCheia), 412);
    linha("Valor equivalente da energia sem o benefício", `${energia(energiaBase)} × ${tarifaKwh(tarifaCheia)} = ${moeda(valorEnergiaCheia)}`, 435);
    linha("Tarifa Andrade após desconto contratado", tarifaKwh(tarifaAndrade), 458);

    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(10).text("2. REGRAS DA CONFIGURAÇÃO", 48, 510);
    cartao(48, 528, 498, 134, "#FFF9E9");
    linha("Energia Andrade antes das absorções", moeda(valorAndradeBruto), 546);
    linha(`Disponibilidade (${disponibilidadeAbsorvida > 0 ? "absorvida" : "repassada"})`, `${moeda(disponibilidade)} · repasse ${moeda(disponibilidadeRepassada)} · absorção ${moeda(disponibilidadeAbsorvida)}`, 569);
    linha(`Fio B (${fioBAbsorvido > 0 ? "absorvido" : "repassado"})`, `${moeda(fioB)} · repasse ${moeda(fioBRepassado)} · absorção ${moeda(fioBAbsorvido)}`, 592);
    linha("Fatura Andrade após as regras", moeda(valorAndrade), 615, true);
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(6.5).text(gd === "GD II" ? "Na GD II, a diferença tarifária do Fio B é apresentada separadamente." : "Na GD I, não há diferença de Fio B; aplica-se somente a regra de disponibilidade configurada.", 62, 641, { width: 466 });

    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(10).text("3. FECHAMENTO", 48, 686);
    cartao(48, 704, 498, 78, "#FFFFFF");
    linha("Conta da concessionária lida", moeda(valorCemigOriginal), 720);
    linha("Conta da concessionária após repasses/absorções", moeda(valorCemigRepassado), 741);
    linha(somenteAndrade ? "Cobrança emitida pela Andrade" : "Concessionária + Andrade = total unificado", somenteAndrade ? moeda(valorAndrade) : `${moeda(valorCemigRepassado)} + ${moeda(valorAndrade)} = ${moeda(totalUnificado)}`, 762, true);

    pdf.addPage({ size: "A4", margins: { top: 42, right: 48, bottom: 42, left: 48 } });
    pdf.rect(0, 0, 595, 842).fill("#F3F7F5");
    pdf.rect(0, 0, 595, 88).fill("#063C25");
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(17).text("Detalhamento e critérios", 48, 31);
    pdf.fillColor("#D8EEE6").font("Helvetica").fontSize(8).text(`Fatura ${fatura.referencia ?? ""} · UC ${fatura.numero_instalacao ?? unidade.numero ?? "-"}`, 48, 55);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(11).text("Como o desconto real é medido", 48, 116);
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(9.5).text("O desconto real compara apenas os componentes convencionais da energia no cenário sem usina com o custo equivalente após o benefício Andrade Energy. Multas, juros, iluminação pública, bandeiras e encargos extraordinários não aumentam nem reduzem artificialmente essa porcentagem.", 48, 139, { width: 498, lineGap: 4 });
    cartao(48, 210, 498, 104, "#E8F6F0");
    linha("Referência convencional sem usina", moeda(referenciaSemAndrade), 230);
    linha("Custo comparável com Andrade", moeda(Math.max(0, referenciaSemAndrade - economia)), 254);
    linha("Economia considerada", moeda(economia), 278);
    linha("Fórmula", `(${moeda(referenciaSemAndrade)} - ${moeda(Math.max(0, referenciaSemAndrade - economia))}) / ${moeda(referenciaSemAndrade)} = ${percentual(descontoReal)}`, 296, true);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(11).text("Informações complementares da conta", 48, 350);
    cartao(48, 372, 498, 142, "#FFFFFF");
    linha("Impostos informados/embutidos", moeda(impostos), 391);
    linha("Iluminação pública (fora da medição do desconto)", moeda(fatura.valor_iluminacao_publica), 416);
    linha("Bandeira tarifária (fora da medição do desconto)", moeda(fatura.valor_bandeira), 441);
    linha("Saldo atual de créditos", energia(fatura.saldo_atual), 466);
    linha("Próxima leitura", fatura.proxima_leitura ? dataBrasileira(fatura.proxima_leitura) : "Não informada", 491);
    pdf.fillColor(VERDE_ESCURO).font("Helvetica-Bold").fontSize(11).text("Observações da modalidade", 48, 552);
    cartao(48, 574, 498, 116, "#FFF9E9");
    const observacaoModalidade = modalidade === "INJECAO"
      ? "Na modalidade por injeção, toda a energia enviada pela usina e destinada à UC compõe a base faturada do período."
      : "Na modalidade por compensação, somente a energia compensada no período é faturada. O saldo acumulado permanece registrado e só é cobrado no encerramento do contrato, conforme a configuração vigente.";
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(9).text(observacaoModalidade, 64, 594, { width: 466, lineGap: 4 });
    pdf.fillColor(TEXTO).font("Helvetica").fontSize(9).text(somenteAndrade ? "Esta UC usa documentos separados: este total representa a cobrança Andrade; a conta da concessionária continua sendo paga à parte." : "Esta UC usa fatura unificada: o total reúne a parcela da concessionária repassada ao cliente e a cobrança Andrade.", 64, 641, { width: 466, lineGap: 4 });
    pdf.fillColor(TEXTO_SECUNDARIO).font("Helvetica").fontSize(7).text(`Documento gerado automaticamente em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Valores monetários arredondados para centavos; prevalecem os registros do faturamento.`, 48, 744, { width: 498, align: "center", lineGap: 2 });
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
  const [pdfUsina, pdfUnificada, pdfRelatorio] = await Promise.all([
    gerarPdfFatura(fatura, "USINA"),
    gerarPdfFatura(fatura, "UNIFICADA"),
    gerarPdfRelatorioCalculo(fatura),
  ]);
  const [cemig, usina, unificada, relatorio] = await Promise.all([
    enviarPdf(`${pasta}/cemig-original.pdf`, original),
    enviarPdf(`${pasta}/fatura-usina.pdf`, pdfUsina),
    enviarPdf(`${pasta}/fatura-unificada.pdf`, pdfUnificada),
    enviarPdf(`${pasta}/${VERSAO_RELATORIO_CALCULO}.pdf`, pdfRelatorio),
  ]);
  const { error } = await supabase.from("faturas").update({
    pdf_cemig_url: cemig,
    pdf_usina_url: usina,
    pdf_unificada_url: unificada,
  }).eq("id", fatura.id);
  if (error) throw error;
  return { cemig, usina, unificada, relatorio };
}

/** Regera somente os demonstrativos Andrade sem alterar a conta CEMIG original. */
export async function regenerarDocumentosGeradosDaFatura(fatura: any) {
  fatura = await preencherDadosTecnicosDaContaOriginal(fatura);
  const pasta = `${fatura.cliente_id}/${fatura.id}`;
  // Um caminho novo evita que o CDN ou o leitor do aparelho reutilize uma
  // versão anterior depois que valores da fatura forem recalculados.
  const versao = Date.now();
  const [pdfUsina, pdfUnificada, pdfRelatorio] = await Promise.all([
    gerarPdfFatura(fatura, "USINA"),
    gerarPdfFatura(fatura, "UNIFICADA"),
    gerarPdfRelatorioCalculo(fatura),
  ]);
  const [usina, unificada] = await Promise.all([
    enviarPdf(`${pasta}/fatura-usina-${VERSAO_LAYOUT_FATURA}-${versao}.pdf`, pdfUsina),
    enviarPdf(`${pasta}/fatura-unificada-${VERSAO_LAYOUT_FATURA}-${versao}.pdf`, pdfUnificada),
  ]);
  await enviarPdf(`${pasta}/${VERSAO_RELATORIO_CALCULO}.pdf`, pdfRelatorio);
  const { error } = await supabase
    .from("faturas")
    .update({ pdf_usina_url: usina, pdf_unificada_url: unificada })
    .eq("id", fatura.id);
  if (error) throw error;
  return { ...fatura, pdf_usina_url: usina, pdf_unificada_url: unificada };
}

export async function obterRelatorioCalculoDaFatura(fatura: any) {
  const pasta = `${fatura.cliente_id}/${fatura.id}`;
  const caminho = `${pasta}/${VERSAO_RELATORIO_CALCULO}.pdf`;
  const pdf = await gerarPdfRelatorioCalculo(fatura);
  await enviarPdf(caminho, pdf);
  return criarLinkTemporario(caminho);
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
