import { buscarClientePorUC } from "../clientes/clientes.repository";
import { criarCobranca } from "../cobrancas/cobrancas.repository";
import { consumirCreditos, registrarCreditosDaFatura, } from "../creditos/consumo.service";
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

export async function processarFatura(
  dados: FaturaExtraida
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
  const podeCorrigir = semBaseDeCalculo && Number(dados.consumo ?? 0) > 0;

  if (podeCorrigir || totalConvencionalSomadoEmDuplicidade || valorConcessionariaFoiReduzido || compensacaoInferidaPeloConsumo) {
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

function competenciaParaIso(referencia: string): string {
  const [mes, ano] = referencia.toUpperCase().split("/");
  const meses: Record<string, string> = { JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06", JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12" };
  if (!meses[mes] || !/^\d{4}$/.test(ano)) throw new Error("Competência da fatura inválida.");
  return `${ano}-${meses[mes]}-01`;
}

async function obterEnergiaInjetada(dados: FaturaExtraida, cliente: any): Promise<{ energia: number; saldoAnterior: number }> {
  const quantidadeFaturada = Number(dados.energiaCompensada ?? 0);
  const saldoAtual = Number(dados.saldoAtual ?? 0);

  if (quantidadeFaturada > 0 || saldoAtual > 0) {
    const { data: anterior, error: erroAnterior } = await supabase
      .from("faturas")
      .select("saldo_atual")
      .eq("numero_instalacao", dados.uc)
      .neq("referencia", dados.referencia)
      .lt("vencimento", vencimento)
      .order("vencimento", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroAnterior) throw erroAnterior;

    const saldoAnterior = Number(anterior?.saldo_atual ?? 0);
    const energia = Math.max(0, quantidadeFaturada + saldoAtual - saldoAnterior);
    if (energia <= 0) throw new Error("A energia injetada calculada para esta competência é igual a zero.");
    return { energia, saldoAnterior };
  }

  const energiaDaFatura = Number(dados.energiaInjetada ?? 0);
  if (energiaDaFatura > 0) return { energia: energiaDaFatura, saldoAnterior: Number(dados.saldoAnterior ?? 0) };

  const { data: fechamento, error } = await supabase
    .from("fechamentos")
    .select("energia_gerada")
    .eq("usina_id", cliente.usina_id)
    .eq("competencia", competenciaParaIso(dados.referencia))
    .maybeSingle();
  if (error) throw error;

  const energiaUsina = Number(fechamento?.energia_gerada ?? 0);
  if (energiaUsina <= 0) {
    throw new Error("Importe primeiro a fatura da usina com a energia injetada desta competência.");
  }

  const { count, error: erroContagem } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("usina_id", cliente.usina_id)
    .eq("status", "ATIVO");
  if (erroContagem) throw erroContagem;

  const percentualInformado = Number(cliente.percentual_rateio ?? 0);
  if (percentualInformado > 0) {
    const fator = percentualInformado > 1 ? percentualInformado / 100 : percentualInformado;
    return { energia: energiaUsina * fator, saldoAnterior: 0 };
  }
  if (Number(count ?? 0) === 1) return { energia: energiaUsina, saldoAnterior: 0 };

  throw new Error("Informe o percentual de rateio do cliente antes de faturar por injeção.");
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
  const injecaoCalculada = modalidade === "INJECAO"
    ? await obterEnergiaInjetada(dados, cliente)
    : { energia: Number(dados.energiaInjetada ?? 0), saldoAnterior: Number(dados.saldoAnterior ?? 0) };
  const energiaInjetadaCalculada = injecaoCalculada.energia;
  const energiaCompensadaCalculada = Number(dados.energiaCompensada ?? 0);
  const valorConcessionaria = Number(dados.valorTotal);

  if (!["INJECAO", "COMPENSACAO"].includes(modalidade)) {
    throw new Error("Modalidade de faturamento do cliente inválida.");
  }

  const calculo = calcularFaturaUnificada({
    modalidade,
    energiaInjetada: energiaInjetadaCalculada,
    energiaCompensada: energiaCompensadaCalculada,
    tarifaCheia: Number(dados.tarifaCheia),
    descontoPercentual,
    valorCemig: valorConcessionaria,
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
    modalidade === "COMPENSACAO"
      ? energiaCompensadaCalculada
      : Number(dados.energiaCompensada),

  saldo_anterior:
    injecaoCalculada.saldoAnterior,

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

  status: "ABERTA",

});

  if (calculo.modalidade === "COMPENSACAO" && temCompensacaoInformada) {

  await registrarCreditosDaFatura({
    clienteId: cliente.id,
    usinaId: cliente.usina_id,
    faturaId: fatura.id,
    competencia: dados.referencia,
    energiaInjetada: Number(dados.energiaInjetada),
    energiaCompensada: energiaCompensadaCalculada,
    saldoAtual: Number(dados.saldoAtual),
  });
  await consumirCreditos(
    
    cliente.id,
    dados.referencia,
    energiaCompensadaCalculada
  );
}

  await criarCobranca({

    clienteId: cliente.id,

    faturaId: fatura.id,

    valor: calculo.valorTotalUnificado,

    vencimento,

  });

  return fatura;

}
