import { buscarClientePorUC } from "../clientes/clientes.repository";
import { criarCobranca } from "../cobrancas/cobrancas.repository";
import { criarCobrancaAsaas } from "../asaas/asaas.service";
import { registrarCreditosDaFatura } from "../creditos/consumo.service";
import { buscarUsina } from "../usinas/usinas.repository";
import {
  calcularDiferencaFioB,
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
  const possuiAbsorcaoConfigurada =
    faturaExistente.repassar_disponibilidade_gd1 === false ||
    faturaExistente.repassar_disponibilidade_gd2 === false ||
    faturaExistente.repassar_diferenca_fio_b_gd2 === false;
  const calculoAbsorcaoDesatualizado =
    possuiAbsorcaoConfigurada && faturaExistente.valor_cemig_repassado == null;
  const podeCorrigir = semBaseDeCalculo && Number(dados.consumo ?? 0) > 0;

  if (podeCorrigir || totalConvencionalSomadoEmDuplicidade || valorConcessionariaFoiReduzido || compensacaoInferidaPeloConsumo || energiaDoPeriodoNaoCalculada || energiaCobradaSemCompensacao || energiaInjetadaComRateio || calculoAbsorcaoDesatualizado) {
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
  const energiaCompensadaGD1 = Math.max(0, Number(dados.energiaCompensadaGD1 ?? 0));
  const energiaCompensadaGD2 = Math.max(0, Number(dados.energiaCompensadaGD2 ?? 0));
  const tipoGdIdentificado = energiaCompensadaGD1 > 0 && energiaCompensadaGD2 > 0
    ? "MISTA"
    : energiaCompensadaGD2 > 0
      ? "GD2"
      : energiaCompensadaGD1 > 0
        ? "GD1"
        : null;
  if (tipoGdIdentificado && cliente.unidade_consumidora?.id) {
    const { error: erroTipoGd } = await supabase
      .from("unidades_consumidoras")
      .update({ tipo_gd: tipoGdIdentificado })
      .eq("id", cliente.unidade_consumidora.id);
    if (erroTipoGd) throw erroTipoGd;
  }
  const energiaCompensadaDaFatura = energiaCompensadaGD1 + energiaCompensadaGD2;
  const energiaCompensadaFaturada = energiaCompensadaDaFatura > 0
    ? energiaCompensadaDaFatura
    : Math.max(0, Number(dados.energiaCompensada ?? 0));
  const temCompensacaoInformada = energiaCompensadaFaturada > 0;
  const percentualAlocado = Math.max(0, Number(cliente.unidade_consumidora?.percentual_rateio ?? cliente.percentual_rateio ?? 0));
  const [saldoAnterior, energiaInjetadaCalculada] = await Promise.all([
    obterSaldoAnterior(dados),
    obterEnergiaInjetadaDaUsina(cliente.usina_id, dados.referencia, percentualAlocado),
  ]);
  // Na modalidade por compensação, a cobrança mensal considera somente a
  // energia efetivamente compensada na fatura. O saldo atual fica apenas
  // registrado para acerto no encerramento do contrato.
  const baseCompensacaoCalculada = energiaCompensadaFaturada;
  const valorConcessionaria = Number(dados.valorTotal);
  const percentualRepasseDisponibilidade = Math.max(0, Math.min(100, Number(cliente.unidade_consumidora?.percentual_repasse_disponibilidade ?? 100)));
  const repassarCustoDisponibilidadeGD2 = cliente.unidade_consumidora?.repassar_disponibilidade_gd2
    ?? percentualRepasseDisponibilidade > 0;
  const repassarCustoDisponibilidadeGD1 = cliente.unidade_consumidora?.repassar_disponibilidade_gd1
    ?? percentualRepasseDisponibilidade > 0;
  const repassarDiferencaFioBGD2 = cliente.unidade_consumidora?.repassar_diferenca_fio_b_gd2 ?? true;
  const faturaSomenteAndrade = Boolean(cliente.unidade_consumidora?.fatura_somente_andrade);
  const tarifaCheia = Math.max(0, Number(dados.tarifaCheia ?? 0));
  const valorEnergiaSemGD = Math.max(0, Number(dados.consumo ?? 0)) * tarifaCheia;

  // GD I: o benefício econômico é a energia compensada pela tarifa cheia.
  // GD II: a CEMIG mantém custos obrigatórios da rede. A parte elegível ao
  // desconto é limitada pelo que restaria da energia depois desses custos.
  // Todos os valores vêm da competência importada, portanto variam a cada mês.
  const creditoGD1 = energiaCompensadaGD1 * tarifaCheia;
  const limiteCreditoGD2 = Math.max(
    0,
    valorEnergiaSemGD - Number(dados.valorEnergiaConcessionaria ?? 0) - creditoGD1
  );
  const creditoGD2 = energiaCompensadaGD2 > 0
    ? Math.min(energiaCompensadaGD2 * tarifaCheia, limiteCreditoGD2)
    : 0;
  const valorCreditoEfetivo = energiaCompensadaDaFatura > 0
    ? creditoGD1 + creditoGD2
    : Math.min(
      energiaCompensadaFaturada * tarifaCheia,
      Math.max(0, valorEnergiaSemGD - Number(dados.valorEnergiaConcessionaria ?? 0))
    );
  // Em GD I e GD II, a disponibilidade é a franquia mínima recalculada a
  // partir da ligação e da tarifa líquida da própria fatura. Na GD II, a
  // diferença do Fio B é a diferença entre tarifa cheia e tarifa GD II.
  // As parcelas podem ser repassadas ou absorvidas separadamente na UC.
  const custoDisponibilidadeRepassavel = energiaCompensadaDaFatura > 0
    ? Math.max(0, Number(dados.custoDisponibilidade ?? 0))
    : 0;
  // O Fio B é a diferença entre a linha Energia SCEE Isenta e a devolução da
  // Energia compensada GD II. A tarifa cheia inclui outros componentes e
  // impostos e produzia um valor muito acima do efetivamente cobrado.
  const tarifaGD2 = Number(dados.tarifaGD2 ?? dados.tarifaGD ?? 0);
  const diferencaFioBRepassavel = calcularDiferencaFioB(
    energiaCompensadaGD2,
    Number(dados.tarifaScee ?? 0),
    tarifaGD2,
  );

  if (!["INJECAO", "COMPENSACAO"].includes(modalidade)) {
    throw new Error("Modalidade de faturamento do cliente inválida.");
  }

  const calculo = calcularFaturaUnificada({
    modalidade,
    energiaInjetada: energiaInjetadaCalculada,
    energiaCompensada: baseCompensacaoCalculada,
    tarifaCheia,
    descontoPercentual,
    valorCemig: valorConcessionaria,
    valorCreditoEfetivo,
    custoDisponibilidadeRepassavel,
    percentualRepasseDisponibilidade,
    repassarCustoDisponibilidade: energiaCompensadaGD2 > 0
      ? repassarCustoDisponibilidadeGD2
      : repassarCustoDisponibilidadeGD1,
    repassarCustoDisponibilidadeGD2,
    diferencaFioBRepassavel,
    repassarDiferencaFioBGD2,
    faturaSomenteAndrade,
    // A disponibilidade e, na GD II, a diferença tarifária continuam na
    // conta da concessionária quando não forem absorvidas pela Andrade.
    baseDescontoReal:
      energiaCompensadaGD2 > 0 ? valorEnergiaSemGD : valorCreditoEfetivo,
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

  valor_cemig_repassado:
    calculo.valorCemigRepassado,

  valor_absorvido_disponibilidade:
    calculo.valorAbsorvidoDisponibilidade,

  valor_absorvido_fio_b:
    calculo.valorAbsorvidoFioB,

  valor_total_absorvido:
    calculo.valorTotalAbsorvido,

  custo_disponibilidade_repassado:
    calculo.custoDisponibilidadeRepassado,

  percentual_repasse_disponibilidade:
    calculo.percentualRepasseDisponibilidade,

  repassar_disponibilidade_gd2:
    calculo.repassarCustoDisponibilidadeGD2,

  repassar_disponibilidade_gd1:
    repassarCustoDisponibilidadeGD1,

  repassar_diferenca_fio_b_gd2:
    calculo.repassarDiferencaFioBGD2,

  diferenca_fio_b:
    calculo.diferencaFioB,

  diferenca_fio_b_repassada:
    calculo.diferencaFioBRepassada,

  fatura_somente_andrade:
    calculo.faturaSomenteAndrade,

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

  if ((opcoes.criarCobranca ?? true) && String(opcoes.status ?? "ABERTA").toUpperCase() !== "RASCUNHO") {
    await criarCobrancaAsaas(fatura.id).catch(() => null);
  }

  return fatura;

}
