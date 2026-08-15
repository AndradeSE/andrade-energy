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
  const podeCorrigir = semBaseDeCalculo && Number(dados.consumo ?? 0) > 0;

  if (podeCorrigir || totalConvencionalSomadoEmDuplicidade) {
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
  const energiaCompensadaCalculada = temCompensacaoInformada
    ? Number(dados.energiaCompensada)
    : Number(dados.consumo);
  const valorEnergiaConvencional = energiaCompensadaCalculada * Number(dados.tarifaCheia);
  const valorConcessionaria = temCompensacaoInformada
    ? Number(dados.valorTotal)
    : Math.max(0, Number(dados.valorTotal) - valorEnergiaConvencional);

  if (!["INJECAO", "COMPENSACAO"].includes(modalidade)) {
    throw new Error("Modalidade de faturamento do cliente inválida.");
  }

  const calculo = calcularFaturaUnificada({
    modalidade,
    energiaInjetada: Number(dados.energiaInjetada),
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
    dados.energiaInjetada,

  energia_compensada:
    energiaCompensadaCalculada,

  saldo_anterior:
    dados.saldoAnterior,

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
