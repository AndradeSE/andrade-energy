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

    pdf.rect(0, 0, 595, 116).fill(verde);
    pdf.circle(535, 22, 78).fillOpacity(0.12).fill(amarelo).fillOpacity(1);
    pdf.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text(String(d.empresa).toUpperCase(), 42, 29, { width: 390 });
    pdf.fillColor(amarelo).fontSize(9).text("PROPOSTA DE ECONOMIA EM ENERGIA", 42, 58, { characterSpacing: 1.2 });
    pdf.fillColor("#D8EAE3").font("Helvetica").fontSize(9).text(`${d.possuiGd ? "Cálculo pela fatura GD" : "Simulação pré-GD"}  |  UC ${d.uc}  |  ${d.tipoGd}`, 42, 83);

    pdf.fillColor(texto).font("Helvetica-Bold").fontSize(18).text(`Olá, ${d.cliente}`, 42, 140);
    pdf.fillColor("#61756D").font("Helvetica").fontSize(10).text(`Esta proposta apresenta o benefício estimado para a UC ${d.uc}, vinculada à ${d.usina}.`, 42, 169, { width: 510 });

    const cards = [
      ["DESCONTO CONTRATADO", percentual(d.descontoContratado)],
      ["DESCONTO REAL ESTIMADO", percentual(d.descontoReal)],
      ["ECONOMIA MENSAL", moeda(d.economiaMensal)],
      ["ECONOMIA EM 12 MESES", moeda(d.economiaMensal * 12)],
    ];
    cards.forEach((card, i) => {
      const x = 42 + (i % 2) * 259, y = 207 + Math.floor(i / 2) * 79;
      pdf.roundedRect(x, y, 243, 63, 10).fill(i === 3 ? verde : suave);
      pdf.fillColor(i === 3 ? "#D8EAE3" : "#557067").font("Helvetica-Bold").fontSize(7.5).text(card[0], x + 15, y + 13, { width: 213 });
      pdf.fillColor(i === 3 ? "#FFFFFF" : verde).fontSize(19).text(card[1], x + 15, y + 29, { width: 213 });
    });

    pdf.fillColor(texto).fontSize(12).text("Comparação mensal", 42, 383);
    const max = Math.max(d.base, 1), barras = [["Sem benefício", d.base, "#B8C7C0"], ["Com benefício", d.valorAndrade + d.disponibilidade + d.fioB, verde]];
    barras.forEach(([rotulo, numero, cor], i) => {
      const y = 414 + i * 48;
      pdf.fillColor("#536A61").font("Helvetica").fontSize(8).text(String(rotulo), 42, y);
      pdf.roundedRect(42, y + 15, 400, 17, 8).fill("#E8EFEB");
      pdf.roundedRect(42, y + 15, Math.max(8, 400 * Number(numero) / max), 17, 8).fill(String(cor));
      pdf.fillColor(texto).font("Helvetica-Bold").fontSize(9).text(moeda(Number(numero)), 453, y + 18, { width: 100 });
    });

    pdf.fillColor(texto).fontSize(12).text("Como chegamos à estimativa", 42, 526);
    const linhas = [
      ["Consumo considerado", `${d.consumo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWh`],
      ["Energia sem benefício", moeda(d.base)],
      ["Energia da empresa", moeda(d.valorAndrade)],
      ["Custo de disponibilidade", moeda(d.disponibilidade)],
      ["Diferença do Fio B", moeda(d.fioB)],
    ];
    linhas.forEach(([r, v], i) => {
      const y = 552 + i * 24;
      if (i % 2 === 0) pdf.rect(42, y - 4, 511, 22).fill("#F5F8F6");
      pdf.fillColor("#52685F").font("Helvetica").fontSize(8.5).text(r, 51, y);
      pdf.fillColor(texto).font("Helvetica-Bold").text(v, 395, y, { width: 145, align: "right" });
    });

    pdf.roundedRect(42, 690, 511, 59, 9).fill("#FFF8D8");
    pdf.fillColor("#795D00").font("Helvetica-Bold").fontSize(8.5).text("IMPORTANTE", 55, 703);
    pdf.font("Helvetica").fontSize(8).text(d.possuiGd
      ? "O desconto real varia conforme consumo, tarifas e custos obrigatórios de cada competência. Multas, iluminação pública e cobranças extraordinárias não mensuram o desconto energético."
      : "Esta é uma simulação anterior à primeira injeção. O cálculo considera 100% do consumo como compensado e será atualizado automaticamente quando chegar a primeira fatura com GD.", 55, 719, { width: 482, lineGap: 2 });
    pdf.fillColor("#718078").fontSize(7.5).text("Proposta informativa. Os valores podem variar mensalmente conforme medição e tarifas da concessionária.", 42, 783, { width: 511, align: "center" });
    pdf.end();
  });
}
