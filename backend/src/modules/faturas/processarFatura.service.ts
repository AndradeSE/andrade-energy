import { buscarClientePorUC } from "../clientes/clientes.repository";
import { criarCobranca } from "../cobrancas/cobrancas.repository";
import { registrarCreditosDaFatura } from "../creditos/consumo.service";
import { buscarUsina } from "../usinas/usinas.repository";
import {
  calcularFaturaUnificada,
  ModalidadeFaturamento,
} from "../billing/billing.engine";
import {
  buscarFatura,
  inserirFatura,
} from "./faturas.repository";

import { FaturaExtraida } from "../../types/FaturaExtraida";
import { supabase } from "../../config/supabase";

function converterDataBrasileiraParaIso(data: string): string {
  const correspondencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data.trim());

  if (!correspondencia) {
    throw new Error("Vencimento da fatura inv\u00e1lido.");
  }

  const [, dia, mes, ano] = correspondencia;
  return `${ano}-${mes}-${dia}`;
}

type OpcoesProcessamentoFatura = {
  status?: "ABERTA" | "RASCUNHO";
  criarCobranca?: boolean;
  registrarCreditos?: boolean;
};

const mesesDaCompetencia: Record<string, string> = {
  JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
  JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
};

function competenciaDaFatura(referencia: string) {
  const referenciaNormalizada = String(referencia ?? "").trim().toUpperCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(referenciaNormalizada)) return referenciaNormalizada.slice(0, 10);

  const partes = referenciaNormalizada.split("/");
  const mes = mesesDaCompetencia[partes[0]] ?? (Number(partes[0]) >= 1 && Number(partes[0]) <= 12 ? String(Number(partes[0])).padStart(2, "0") : null);
  const ano = partes[1];
  return mes && /^\d{4}$/.test(String(ano)) ? `${ano}-${mes}-01` : null;
}

export async function processarFatura(
  dados: FaturaExtraida,
  opcoes: OpcoesProcessamentoFatura = {},
) {

  const vencimento = converterDataBrasileiraParaIso(dados.vencimento);

  const cliente = await buscarClientePorUC(dados.uc);

  if (!cliente) {

  return {

    clienteNaoEncontrado: true,

    dadosCadastro: {

      nome: dados.cliente,

      uc: dados.uc,

      distribuidora: dados.distribuidora,

    },

  };

}
const faturaExistente = await buscarFatura(
  dados.uc,
  dados.referencia
);

if (faturaExistente) {

  const semBaseDeCalculo = Number(faturaExistente.base_calculo_kwh ?? 0) === 0;
  const totalConvencionalSomadoEmDuplicidade =
    Number(faturaExistente.energia_injetada ?? 0) === 0 &&
    Number(faturaExistente.energia_compensada ?? 0) > 0 &&
    Number(faturaExistente.valor_total_unificado ?? 0) > Number(faturaExistente.valor_cemig ?? 0);
  const valorConcessionariaFoiReduzido =
    Number(faturaExistente.valor_cemig ?? 0) < Number(dados.valorTotal ?? 0);
  const compensacaoInferidaPeloConsumo =
    Number(dados.energiaCompensada ?? 0) === 0 &&
    Number(faturaExistente.energia_compensada ?? 0) > 0;
  const energiaDoPeriodoNaoCalculada =
    Number(faturaExistente.energia_injetada ?? 0) === 0 &&
    (Number(dados.energiaCompensada ?? 0) > 0 || Number(dados.saldoAtual ?? 0) > 0);
  const energiaCobradaSemCompensacao =
    Number(dados.energiaCompensada ?? 0) === 0 &&
    Number(faturaExistente.base_calculo_kwh ?? 0) > 0;
  // Reimportar uma conta de uma UC já alocada também atualiza a energia
  // injetada pela produção da usina e pelo percentual de rateio vigente.
  const possuiRateioDaUsina = Number(cliente.unidade_consumidora?.percentual_rateio ?? cliente.percentual_rateio ?? 0) > 0;
  const energiaInjetadaComRateio = possuiRateioDaUsina && Number(faturaExistente.energia_injetada ?? 0) > 0;
  const podeCorrigir = semBaseDeCalculo && Number(dados.consumo ?? 0) > 0;

  if (podeCorrigir || totalConvencionalSomadoEmDuplicidade || valorConcessionariaFoiReduzido || compensacaoInferidaPeloConsumo || energiaDoPeriodoNaoCalculada || energiaCobradaSemCompensacao || energiaInjetadaComRateio) {
    for (const tabela of ["notificacoes_fatura", "cobrancas", "creditos"]) {
      await supabase.from(tabela).delete().eq("fatura_id", faturaExistente.id);
    }
    await supabase.from("faturas").delete().eq("id", faturaExistente.id);
  } else {

  return {

    jaProcessada: true,

    mensagem: "Esta fatura já foi importada anteriormente.",

    fatura: faturaExistente,

  };

  }

}

async function obterSaldoAnterior(dados: FaturaExtraida) {
  const { data: anterior, error } = await supabase
    .from("faturas")
    .select("saldo_atual")
    .eq("numero_instalacao", dados.uc)
    .neq("referencia", dados.referencia)
    .lt("vencimento", vencimento)
    .order("vencimento", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Number(anterior?.saldo_atual ?? 0);
}

async function obterEnergiaInjetadaDaUsina(usinaId: string, referencia: string, percentualRateio: number) {
  const competencia = competenciaDaFatura(referencia);
  if (!competencia || percentualRateio <= 0) return 0;

  const { data: fechamento, error } = await supabase
    .from("fechamentos")
    .select("energia_gerada")
    .eq("usina_id", usinaId)
    .eq("competencia", competencia)
    .maybeSingle();
  if (error) throw error;

  const energiaGerada = Math.max(0, Number(fechamento?.energia_gerada ?? 0));
  return Number((energiaGerada * Math.min(100, percentualRateio) / 100).toFixed(3));
}
if (!cliente.usina_id) {
  throw new Error(
    "Cliente não possui usina vinculada."
  );
  }
  const usina = await buscarUsina(cliente.usina_id);
  const modalidade = String(
    cliente.modalidade_faturamento ??
      usina.modelo ??
      usina.modalidade ??
      "COMPENSACAO"
  ).toUpperCase() as ModalidadeFaturamento;
  const descontoPercentual = Number(cliente.desconto_percentual ?? 40);
  const temCompensacaoInformada = Number(dados.energiaCompensada) > 0;
  const percentualAlocado = Math.max(0, Number(cliente.unidade_consumidora?.percentual_rateio ?? cliente.percentual_rateio ?? 0));
  const [saldoAnterior, energiaInjetadaCalculada] = await Promise.all([
    obterSaldoAnterior(dados),
    obterEnergiaInjetadaDaUsina(cliente.usina_id, dados.referencia, percentualAlocado),
  ]);
  const energiaCompensadaFaturada = Number(dados.energiaCompensada ?? 0);
  // Na modalidade por compensação, a cobrança mensal considera somente a
  // energia efetivamente compensada na fatura. O saldo atual fica apenas
  // registrado para acerto no encerramento do contrato.
  const baseCompensacaoCalculada = energiaCompensadaFaturada;
  const valorConcessionaria = Number(dados.valorTotal);
  const valorEnergiaSemGD = Number(dados.consumo ?? 0) * Number(dados.tarifaCheia ?? 0);
  const valorCreditoEfetivo = Math.min(
    energiaCompensadaFaturada * Number(dados.tarifaCheia ?? 0),
    Math.max(0, valorEnergiaSemGD - Number(dados.valorEnergiaConcessionaria ?? 0))
  );

  if (!["INJECAO", "COMPENSACAO"].includes(modalidade)) {
    throw new Error("Modalidade de faturamento do cliente inválida.");
  }

  const calculo = calcularFaturaUnificada({
    modalidade,
    energiaInjetada: energiaInjetadaCalculada,
    energiaCompensada: baseCompensacaoCalculada,
    tarifaCheia: Number(dados.tarifaCheia),
    descontoPercentual,
    valorCemig: valorConcessionaria,
    valorCreditoEfetivo,
  });

const fatura = await inserirFatura({

  cliente_id: cliente.id,

  unidade_consumidora_id:
    cliente.unidade_consumidora?.id ?? null,

  usina_id: cliente.usina_id,

  numero_instalacao: dados.uc,

  referencia: dados.referencia,

  vencimento,

  consumo: dados.consumo,

  consumo_kwh: dados.consumo,

  energia_injetada:
    energiaInjetadaCalculada,

  energia_compensada:
    energiaCompensadaFaturada,

  saldo_anterior:
    saldoAnterior,

  saldo_atual:
    dados.saldoAtual,

  tarifa_cheia:
    dados.tarifaCheia,

  tarifa_gd:
    dados.tarifaGD,

  custo_disponibilidade:
    dados.custoDisponibilidade,

  desconto_percentual:
    calculo.descontoContratadoPercentual,

  desconto_contratado_percentual:
    calculo.descontoContratadoPercentual,

  desconto_contratado_valor:
    calculo.descontoContratadoValor,

  modalidade_faturamento:
    calculo.modalidade,

  base_calculo_kwh:
    calculo.baseCalculoKwh,

  tarifa_andrade:
    calculo.tarifaAndrade,

  valor_energia_cheia:
    calculo.valorEnergiaCheia,

  valor_andrade:
    calculo.valorUsina,

  valor_usina:
    calculo.valorUsina,

  valor_cemig:
    calculo.valorCemig,

  valor_referencia_sem_andrade:
    calculo.valorReferenciaSemAndrade,

  valor_total_unificado:
    calculo.valorTotalUnificado,

  economia_real:
    calculo.economiaReal,

  desconto_real_percentual:
    calculo.descontoRealPercentual,

  valor_total:
    calculo.valorTotalUnificado,

  economia:
    calculo.economiaReal,

  bandeira:
    dados.bandeira,

  distribuidora:
    dados.distribuidora,

  status: opcoes.status ?? "ABERTA",

});

  if ((opcoes.registrarCreditos ?? true) && calculo.modalidade === "COMPENSACAO" && temCompensacaoInformada) {

  await registrarCreditosDaFatura({
    clienteId: cliente.id,
    usinaId: cliente.usina_id,
    faturaId: fatura.id,
    competencia: dados.referencia,
    energiaInjetada: energiaInjetadaCalculada,
    energiaCompensada: energiaCompensadaFaturada,
    saldoAtual: Number(dados.saldoAtual),
  });
}

  if (opcoes.criarCobranca ?? true) await criarCobranca({

    clienteId: cliente.id,

    faturaId: fatura.id,

    valor: calculo.valorTotalUnificado,

    vencimento,

  });

  return fatura;

}
