import {
  buscarFatura,
  salvarFaturaBanco,
} from "../../repositories/faturas.repository";

function converterData(data: string) {
  const [dia, mes, ano] = data.split("/");
  return `${ano}-${mes}-${dia}`;
}

export async function salvarFatura(
  clienteId: string,
  dados: any
) {
  const existente = await buscarFatura(
    clienteId,
    dados.referencia
  );

  if (existente) return existente;

  const tarifaAndrade =
    dados.tarifaCheia * 0.6;

  const valorAndrade =
    dados.energiaCompensada *
      tarifaAndrade +
    dados.custoDisponibilidade;

  const economiaReal =
    dados.energiaCompensada *
      (dados.tarifaCheia - tarifaAndrade);

  return salvarFaturaBanco({

    cliente_id: clienteId,

    referencia: dados.referencia,

    numero_instalacao: dados.uc,

    uc: dados.uc,

    distribuidora: dados.distribuidora,

    vencimento: converterData(
      dados.vencimento
    ),

    consumo_kwh: dados.consumo,

    energia_injetada:
      dados.energiaInjetada,

    energia_compensada:
      dados.energiaCompensada,

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

    desconto_percentual: 40,

    tarifa_andrade:
      tarifaAndrade,

    valor_andrade:
      Number(
        valorAndrade.toFixed(2)
      ),

    valor_cemig:
      dados.valorTotal,

    economia_real:
      Number(
        economiaReal.toFixed(2)
      ),

    valor_energia:
      dados.tarifaGD,

    valor_total:
      dados.valorTotal,

    economia:
      dados.economia,

    bandeira:
      dados.bandeira,

    valor_bandeira:
      dados.valorBandeira ?? 0,

    status: "PROCESSADA",

    arquivo_url: "",

  });
}
