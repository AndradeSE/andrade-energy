import PDFDocument from "pdfkit";

import { supabase } from "../../config/supabase";
import { listarUsinasService } from "../usinas/usinas.service";

const verde = "#075B43";
const amarelo = "#F3C623";
const texto = "#18372D";
const suave = "#EFF6F2";

function n(valor: unknown) {
  const numero = Number(String(valor ?? 0).replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}
function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
function valor(dados: any, ...chaves: string[]) {
  for (const chave of chaves) if (n(dados?.[chave])) return n(dados[chave]);
  return 0;
}

export type EntradaCalculoProposta = {
  consumo: number;
  tarifaCheia: number;
  descontoContratado: number;
  tipoGd: string;
  custoDisponibilidade: number;
  diferencaFioB: number;
  absorveDisponibilidade: boolean;
  absorveFioB: boolean;
};

/**
 * Regra comercial oficial da proposta.
 *
 * A referência é somente a energia convencional (kWh x tarifa cheia). O valor
 * Andrade recebe o desconto contratado e, quando configurado, devolve o custo
 * de disponibilidade e/ou o Fio B. Os custos GD continuam na concessionária;
 * por isso só deixam de reduzir o desconto real quando são devolvidos.
 */
export function calcularPropostaComercial(entrada: EntradaCalculoProposta) {
  const consumo = Math.max(0, entrada.consumo);
  const tarifaCheia = Math.max(0, entrada.tarifaCheia);
  const descontoContratado = Math.max(0, Math.min(100, entrada.descontoContratado));
  const base = consumo * tarifaCheia;
  const disponibilidade = Math.max(0, entrada.custoDisponibilidade);
  const fioB = String(entrada.tipoGd).toUpperCase() === "GD2" ? Math.max(0, entrada.diferencaFioB) : 0;
  const devolucoes = (entrada.absorveDisponibilidade ? disponibilidade : 0) + (entrada.absorveFioB ? fioB : 0);
  const valorAndrade = Math.max(0, base * (1 - descontoContratado / 100) - devolucoes);
  const totalProjetado = valorAndrade + disponibilidade + fioB;
  const economiaMensal = Math.max(0, Math.min(base * descontoContratado / 100, base - totalProjetado));
  const descontoReal = base > 0 ? economiaMensal / base * 100 : 0;
  return { base, disponibilidade, fioB, valorAndrade, totalProjetado, economiaMensal, descontoReal };
}

export async function obterPropostaParaConvite(clienteId: string, empresaId: string) {
  const [{ data: cliente }, { data: unidades }, { data: anexos }, { data: empresa }, usinas] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", clienteId).eq("empresa_id", empresaId).maybeSingle(),
    supabase.from("unidades_consumidoras").select("*").eq("cliente_id", clienteId).eq("empresa_id", empresaId).eq("status", "ATIVA").order("created_at"),
    supabase.from("faturas_anexadas_clientes").select("*").eq("cliente_id", clienteId).eq("empresa_id", empresaId).order("criado_em", { ascending: false }),
    supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle(),
    listarUsinasService(empresaId),
  ]);
  const unidade = (unidades ?? []).find((item: any) => String(item.numero) === String(cliente?.uc)) ?? unidades?.[0];
  if (!cliente || !unidade) return null;
  const anexo = (anexos ?? []).find((item: any) => String(item.dados_fatura?.uc ?? "").replace(/\D/g, "") === String(unidade.numero).replace(/\D/g, "")) ?? anexos?.[0];
  const dados = anexo?.dados_fatura ?? {};
  const consumo = valor(dados, "consumo", "consumo_kwh", "consumoFaturado") || n(unidade.consumo_medio_kwh);
  const tarifaCheia = valor(dados, "tarifaCheia", "tarifa_cheia");
  if (consumo <= 0 || tarifaCheia <= 0) return null;

  const usina = usinas.find((item: any) => item.id === unidade.usina_id);
  const tipoGd = String(usina?.tipo_gd ?? unidade.tipo_gd ?? dados.tipoGd ?? "GD1").toUpperCase();
  const descontoContratado = Math.max(0, Math.min(100, n(unidade.desconto_percentual ?? cliente.desconto_percentual ?? 40)));
  const base = consumo * tarifaCheia;
  const franquia = valor(dados, "franquiaDisponibilidadeKwh", "franquia_disponibilidade_kwh") || 30;
  const tarifaSemImpostos = valor(dados, "tarifaDisponibilidadeSemImpostos", "tarifa_disponibilidade_sem_impostos");
  const disponibilidadeGd1 = valor(dados, "custoDisponibilidadeGD1", "custo_disponibilidade_gd1") || franquia * tarifaSemImpostos;
  const disponibilidadeGd2 = valor(dados, "custoDisponibilidadeGD2", "custo_disponibilidade_gd2", "custoDisponibilidade", "custo_disponibilidade") || Math.max(0, franquia * (tarifaCheia - tarifaSemImpostos));
  const disponibilidade = tipoGd === "GD2" ? disponibilidadeGd2 : disponibilidadeGd1;
  const historico = Array.isArray(usina?.historico_tarifas_gd2) ? usina.historico_tarifas_gd2 : [];
  const tarifaScee = valor(dados, "tarifaScee", "tarifa_scee") || n(historico[0]?.tarifa_scee) || tarifaCheia;
  const tarifaGd2 = valor(dados, "tarifaGD2", "tarifaGD", "tarifa_gd") || n(historico[0]?.tarifa_gd2);
  const fioB = tipoGd === "GD2"
    ? Math.max(0, tarifaGd2 > 0 ? consumo * (tarifaScee - tarifaGd2) : consumo * tarifaScee * 0.13)
    : 0;
  const repassaDisponibilidade = tipoGd === "GD2"
    ? unidade.repassar_disponibilidade_gd2 ?? n(unidade.percentual_repasse_disponibilidade ?? 100) > 0
    : unidade.repassar_disponibilidade_gd1 ?? true;
  const repassaFioB = unidade.repassar_diferenca_fio_b_gd2 ?? true;
  const resultado = calcularPropostaComercial({
    consumo,
    tarifaCheia,
    descontoContratado,
    tipoGd,
    custoDisponibilidade: disponibilidade,
    diferencaFioB: fioB,
    absorveDisponibilidade: !repassaDisponibilidade,
    absorveFioB: tipoGd === "GD2" && !repassaFioB,
  });
  const { valorAndrade, economiaMensal, descontoReal } = resultado;
  const possuiGd = valor(dados, "energiaCompensada", "energia_compensada", "energiaInjetada", "energia_injetada") > 0;
  const { data: faturas } = await supabase
    .from("faturas")
    .select("referencia,numero_instalacao,unidade_consumidora_id,valor_energia_cheia,valor_total_unificado,valor_total,economia_real,consumo,consumo_kwh")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId)
    .order("referencia", { ascending: true });
  const historicoMensal = (faturas ?? [])
    .filter((item: any) => item.unidade_consumidora_id === unidade.id || String(item.numero_instalacao).replace(/\D/g, "") === String(unidade.numero).replace(/\D/g, ""))
    .map((item: any) => {
      const semBeneficio = n(item.valor_energia_cheia) || Math.max(0, n(item.valor_total) + n(item.economia_real));
      // Reprocessa o histórico com a configuração comercial atual. Isso evita
      // que uma proposta nova reutilize percentuais gravados por regras antigas.
      const economia = semBeneficio * resultado.descontoReal / 100;
      return { referencia: String(item.referencia ?? ""), semBeneficio, comBeneficio: Math.max(0, semBeneficio - economia), economia };
    })
    .filter((item: any) => item.semBeneficio > 0 && item.comBeneficio > 0)
    .slice(-6);
  if (!historicoMensal.length) historicoMensal.push({
    referencia: String(dados.referencia ?? "Atual"),
    semBeneficio: resultado.base,
    comBeneficio: resultado.totalProjetado,
    economia: resultado.economiaMensal,
  });

  const pdf = await gerarPropostaPdf({
    empresa: empresa?.nome_fantasia ?? empresa?.nome ?? "Andrade Energy",
    cliente: cliente.nome,
    uc: unidade.numero,
    usina: usina?.nome ?? "Usina a definir",
    tipoGd,
    consumo,
    descontoContratado,
    descontoReal,
    base,
    valorAndrade,
    disponibilidade,
    fioB,
    economiaMensal,
    totalProjetado: resultado.totalProjetado,
    historicoMensal,
    possuiGd,
  });
  return { filename: `proposta-comercial-uc-${String(unidade.numero).replace(/\D/g, "")}.pdf`, content: pdf };
}

async function gerarPropostaPdf(d: any) {
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margins: { top: 0, right: 42, bottom: 32, left: 42 }, info: { Title: `Proposta comercial - UC ${d.uc}` } });
    const partes: Buffer[] = [];
    pdf.on("data", (parte) => partes.push(parte));
    pdf.on("end", () => resolve(Buffer.concat(partes)));
    pdf.on("error", reject);

    const cabecalho = (pagina: string) => {
      pdf.rect(0, 0, 595, 105).fill(verde);
      pdf.circle(545, 8, 76).fillOpacity(0.12).fill(amarelo).fillOpacity(1);
      pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(19).text(String(d.empresa).toUpperCase(), 42, 25, { width: 390 });
      pdf.fillColor(amarelo).fontSize(8.5).text("PROPOSTA PERSONALIZADA DE ECONOMIA", 42, 54, { characterSpacing: 1.1 });
      pdf.fillColor("#D8EAE3").font("Helvetica").fontSize(8.5).text(`UC ${d.uc}  |  ${d.tipoGd}  |  ${pagina}`, 42, 78);
    };
    const mediaHistorica = d.historicoMensal.reduce((s: number, item: any) => s + item.economia, 0) / Math.max(1, d.historicoMensal.length);
    const mediaSemBeneficio = d.historicoMensal.reduce((s: number, item: any) => s + item.semBeneficio, 0) / Math.max(1, d.historicoMensal.length);
    const mediaComBeneficio = d.historicoMensal.reduce((s: number, item: any) => s + item.comBeneficio, 0) / Math.max(1, d.historicoMensal.length);
    const economiaMensalProjetada = mediaHistorica > 0 ? mediaHistorica : d.economiaMensal;
    const economiaAnual = economiaMensalProjetada * 12;
    const semBeneficioAnual = mediaSemBeneficio * 12;
    const comBeneficioAnual = mediaComBeneficio * 12;

    cabecalho("Visão executiva");
    pdf.fillColor(texto).font("Helvetica-Bold").fontSize(15).text(`Uma economia planejada para ${d.cliente}`, 42, 128, { width: 510, height: 40 });
    pdf.fillColor("#61756D").font("Helvetica").fontSize(9.5).text(`Projeção construída a partir da fatura e do histórico disponível da UC, vinculada à ${d.usina}.`, 42, 170, { width: 510 });
    const cards = [
      ["DESCONTO CONTRATADO", percentual(d.descontoContratado), "#EAF5EF", verde],
      ["DESCONTO REAL ESTIMADO", percentual(d.descontoReal), "#E8F0FF", "#2255A4"],
      ["ECONOMIA MÉDIA MENSAL", moeda(economiaMensalProjetada), "#FFF4D1", "#886300"],
      ["ECONOMIA PROJETADA EM 12 MESES", moeda(economiaAnual), verde, "#FFFFFF"],
    ];
    cards.forEach((card, i) => {
      const x = 42 + (i % 2) * 259, y = 194 + Math.floor(i / 2) * 75;
      pdf.roundedRect(x, y, 243, 59, 10).fill(String(card[2]));
      pdf.fillColor(i === 3 ? "#BDE6D5" : "#61756D").font("Helvetica-Bold").fontSize(7).text(String(card[0]), x + 14, y + 12, { width: 215 });
      pdf.fillColor(String(card[3])).fontSize(18).text(String(card[1]), x + 14, y + 28, { width: 215 });
    });

    pdf.fillColor(texto).fontSize(12).text("Projeção financeira anual", 42, 365);
    pdf.fillColor("#6B7E77").font("Helvetica").fontSize(8).text("Cada par de colunas compara o custo estimado sem e com o benefício.", 42, 383);
    const chartX = 50, chartY = 425, chartH = 170, chartW = 495;
    const maxAnualMes = Math.max(mediaSemBeneficio, mediaComBeneficio, 1);
    [0, .25, .5, .75, 1].forEach((f) => {
      const y = chartY + chartH - chartH * f;
      pdf.moveTo(chartX, y).lineTo(chartX + chartW, y).lineWidth(.5).strokeColor("#DCE7E1").stroke();
    });
    const nomesMeses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    nomesMeses.forEach((mes, i) => {
      const grupoX = chartX + i * 41.2;
      const hSem = chartH * mediaSemBeneficio / maxAnualMes;
      const hCom = chartH * mediaComBeneficio / maxAnualMes;
      pdf.roundedRect(grupoX + 4, chartY + chartH - hSem, 12, hSem, 3).fill("#67A6E8");
      pdf.roundedRect(grupoX + 19, chartY + chartH - hCom, 12, hCom, 3).fill(i % 2 ? "#0A7656" : "#12A06E");
      pdf.fillColor("#60736B").font("Helvetica-Bold").fontSize(6.2).text(mes, grupoX, chartY + chartH + 8, { width: 36, align: "center" });
    });
    pdf.rect(42, 628, 511, 69).fill("#F3F7F5");
    [["SEM BENEFÍCIO / ANO", semBeneficioAnual, "#67A6E8"], ["COM BENEFÍCIO / ANO", comBeneficioAnual, "#12A06E"]].forEach((item, i) => {
      const x = 59 + i * 250;
      pdf.circle(x, 650, 5).fill(String(item[2]));
      pdf.fillColor("#687A73").fontSize(7).text(String(item[0]), x + 12, 644, { width: 200 });
      pdf.fillColor(texto).font("Helvetica-Bold").fontSize(15).text(moeda(Number(item[1])), x + 12, 660, { width: 200 });
    });
    pdf.roundedRect(42, 720, 511, 55, 9).fill("#FFF6CF");
    pdf.fillColor("#765900").fontSize(8).text("Estimativa anual baseada na configuração contratual e na média disponível. Consumo, tarifas e encargos podem variar mensalmente; por isso, a economia efetiva é recalculada em cada fatura.", 56, 735, { width: 478, lineGap: 2 });

    pdf.addPage({ size: "A4", margins: { top: 0, right: 42, bottom: 32, left: 42 } });
    cabecalho("Histórico e memória de cálculo");
    pdf.fillColor(texto).font("Helvetica-Bold").fontSize(14).text("Histórico reprocessado da unidade", 42, 130);
    pdf.fillColor("#64776F").font("Helvetica").fontSize(8).text("Cada mês disponível é recalculado com a configuração comercial atual da UC.", 42, 151);
    const hist = d.historicoMensal.slice(-6);
    const maxHist = Math.max(...hist.map((item: any) => item.semBeneficio), 1);
    hist.forEach((item: any, i: number) => {
      const y = 187 + i * 50;
      pdf.fillColor(texto).font("Helvetica-Bold").fontSize(7.5).text(String(item.referencia || "Atual"), 42, y + 9, { width: 70 });
      const larguraSem = 300 * item.semBeneficio / maxHist;
      const larguraCom = 300 * item.comBeneficio / maxHist;
      pdf.roundedRect(113, y, larguraSem, 10, 4).fill("#67A6E8");
      pdf.roundedRect(113, y + 16, larguraCom, 10, 4).fill("#12A06E");
      pdf.fillColor("#456158").font("Helvetica").fontSize(6.8).text(`Economia ${moeda(item.economia)}`, 425, y + 7, { width: 125, align: "right" });
    });
    const memoriaY = Math.max(280, 190 + hist.length * 50);
    pdf.fillColor(texto).font("Helvetica-Bold").fontSize(13).text("Memória da estimativa atual", 42, memoriaY);
    const linhas = [
      ["Consumo considerado", `${d.consumo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWh`],
      ["Energia sem benefício", moeda(d.base)],
      ["Energia da empresa", moeda(d.valorAndrade)],
      ["Custo de disponibilidade", moeda(d.disponibilidade)],
      ["Diferença do Fio B", moeda(d.fioB)],
      ["Total estimado com benefício", moeda(d.totalProjetado)],
    ];
    linhas.forEach(([r, v], i) => {
      const y = memoriaY + 30 + i * 26;
      pdf.roundedRect(42, y - 5, 511, 22, 4).fill(i % 2 ? "#FFFFFF" : "#F1F6F3");
      pdf.fillColor("#52685F").font("Helvetica").fontSize(8.5).text(r, 52, y);
      pdf.fillColor(texto).font("Helvetica-Bold").text(v, 395, y, { width: 145, align: "right" });
    });
    const criterioY = memoriaY + 202;
    pdf.roundedRect(42, criterioY, 511, 62, 9).fill("#FFF6CF");
    pdf.fillColor("#765900").font("Helvetica-Bold").fontSize(8).text("CRITÉRIO", 55, criterioY + 13);
    pdf.font("Helvetica").fontSize(7.7).text(d.possuiGd
      ? "O desconto real considera os custos energéticos convencionais da competência. Multas, iluminação pública, bandeiras e cobranças extraordinárias não são usados para mensurar o desconto energético."
      : "Como esta conta ainda é pré-GD, a simulação considera o consumo como compensado. Assim que chegar a primeira fatura com GD, as tarifas e parcelas reais substituem automaticamente a estimativa.", 55, criterioY + 28, { width: 480, lineGap: 2 });
    pdf.fillColor("#718078").fontSize(7).text("Documento informativo elaborado a partir dos dados disponíveis no sistema.", 42, 805, { width: 511, align: "center" });
    pdf.end();
  });
}
