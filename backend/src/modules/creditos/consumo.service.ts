import {
  buscarSaldoAtual,
  registrarConsumo,
  registrarSaldoDaFatura,
} from "./consumo.repository";

function competenciaParaData(competencia: string): string {
  const [mes, ano] = competencia.split("/");
  const meses: Record<string, string> = {
    JAN: "01", FEV: "02", MAR: "03", ABR: "04",
    MAI: "05", JUN: "06", JUL: "07", AGO: "08",
    SET: "09", OUT: "10", NOV: "11", DEZ: "12",
  };

  if (!meses[mes] || !/^\d{4}$/.test(ano)) {
    throw new Error("Competência da fatura inválida.");
  }

  return `${ano}-${meses[mes]}-01`;
}

export async function consumirCreditos(
  clienteId: string,
  competencia: string,
  energiaConsumida: number
) {

  console.log("=== consumirCreditos ===");
  console.log({
    clienteId,
    competencia,
    energiaConsumida,
  });

  const saldo = await buscarSaldoAtual(clienteId);

  console.log("SALDO ENCONTRADO:", saldo);

  if (!saldo)
    throw new Error("Cliente sem créditos.");

  const saldoDisponivel =
    Number(saldo.saldo_atual ?? saldo.saldo ?? 0);

  console.log("Saldo disponível:", saldoDisponivel);

  const novoSaldo =
    saldoDisponivel - energiaConsumida;

  console.log("Novo saldo:", novoSaldo);

  return registrarConsumo({
    cliente_id: clienteId,
    competencia: competenciaParaData(competencia),
    entrada: 0,
    saida: energiaConsumida,
    saldo: novoSaldo,
    saldo_atual: novoSaldo,
    origem: "FATURA",
  });
}

export async function registrarCreditosDaFatura({
  clienteId,
  usinaId,
  faturaId,
  competencia,
  energiaInjetada,
  energiaCompensada,
  saldoAtual,
}: {
  clienteId: string;
  usinaId: string;
  faturaId: string;
  competencia: string;
  energiaInjetada: number;
  energiaCompensada: number;
  saldoAtual: number;
}) {
  return registrarSaldoDaFatura({
    cliente_id: clienteId,
    usina_id: usinaId,
    fatura_id: faturaId,
    competencia: competenciaParaData(competencia),
    entrada: energiaInjetada,
    saida: energiaCompensada,
    saldo: saldoAtual,
    saldo_atual: saldoAtual,
    origem: "FATURA",
    descricao: "Saldo informado na fatura da distribuidora.",
  });
}
