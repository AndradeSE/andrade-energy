import { supabase } from "../supabase";

export async function carregarFinanceiro() {
  const { data, error } = await supabase
    .from("faturas")
    .select("*");

  if (error) throw error;

  const faturas = data ?? [];

  const receitaPrevista = faturas.reduce(
    (acc, item) => acc + Number(item.valor_total || 0),
    0
  );

  const receitaRecebida = faturas
    .filter(item => item.status === "PAGO")
    .reduce(
      (acc, item) => acc + Number(item.valor_total || 0),
      0
    );

  const valorEmAberto = receitaPrevista - receitaRecebida;

  const inadimplentes = faturas.filter(
    item => item.status !== "PAGO"
  ).length;

  const ticketMedio =
    faturas.length > 0
      ? receitaPrevista / faturas.length
      : 0;

  const percentualRecebido =
    receitaPrevista > 0
      ? (receitaRecebida / receitaPrevista) * 100
      : 0;

      const agrupado: Record<string, number> = {};

for (const fatura of faturas) {
  const competencia = fatura.referencia;

  agrupado[competencia] =
    (agrupado[competencia] || 0) +
    Number(fatura.valor_total || 0);
}

const historicoMensal = Object.entries(agrupado)
  .map(([competencia, valor]) => ({
    competencia,
    valor,
  }))
  .sort((a, b) => {
    const [mesA, anoA] = a.competencia.split("/");
    const [mesB, anoB] = b.competencia.split("/");

    return (
      new Date(Number(anoA), Number(mesA) - 1).getTime() -
      new Date(Number(anoB), Number(mesB) - 1).getTime()
    );
  });

  return {
  receitaPrevista,
  receitaRecebida,
  valorEmAberto,
  inadimplentes,
  ticketMedio,
  percentualRecebido,
  totalFaturas: faturas.length,
  historicoMensal,
};
}