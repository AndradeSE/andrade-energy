import { buscarDashboard } from "./dashboard.repository";

export async function obterDashboard(
  clienteId: string
) {

  const dados =
    await buscarDashboard(clienteId);
console.log("ULTIMA FATURA:");
console.log(dados.ultimaFatura);
  return {

    cliente: dados.cliente?.nome,

    uc: dados.cliente?.uc,

    distribuidora: dados.cliente?.distribuidora,

    economiaMes: 0,

    economiaAcumulada: 0,

    consumo:

      dados.ultimaFatura?.consumo_kwh ?? 0,

    creditos: 0,

    ultimaFatura: {

  id: dados.ultimaFatura?.id,

  competencia:
    dados.ultimaFatura?.referencia,

  valor:
    dados.ultimaFatura?.valor_total,

  vencimento:
    dados.ultimaFatura?.vencimento

},

    historico:

      dados.historico ?? []

  };

}