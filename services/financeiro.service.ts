import { supabase } from "../supabase";

export async function carregarFinanceiro() {
  const { data, error } = await supabase
    .from("faturas")
    .select("*");

  if (error) throw error;

  const faturas = data ?? [];

  const receitaPrevista = faturas.reduce(
    (acc, f) => acc + Number(f.valor_total || 0),
    0
  );

  const receitaRecebida = faturas
    .filter(f => f.status === "PAGO")
    .reduce(
      (acc, f) => acc + Number(f.valor_total || 0),
      0
    );

  const valorEmAberto = receitaPrevista - receitaRecebida;

  const inadimplentes = faturas.filter(
    f => f.status !== "PAGO"
  ).length;

  return {
    receitaPrevista,
    receitaRecebida,
    valorEmAberto,
    inadimplentes,
    totalFaturas: faturas.length,
  };
}