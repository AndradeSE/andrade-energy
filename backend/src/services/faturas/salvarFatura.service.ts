import {
    buscarFatura,
    salvarFaturaBanco
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
    dados.competencia
  );

  if (existente) {
    return existente;
  }

  return salvarFaturaBanco({

    cliente_id: clienteId,

    referencia: dados.competencia,

    numero_instalacao: dados.uc,

    nome_cliente: dados.cliente,

    vencimento: converterData(dados.vencimento),

    consumo_kwh: dados.consumoKwh,

    valor_energia: dados.tarifaEnergia,

    valor_total: dados.valorTotal,

    valor_final: dados.valorTotal,

    economia: 0,

    arquivo_url: ""

  });

}