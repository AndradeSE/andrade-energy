import { supabase } from "../../config/supabase";
import { listarFaturas } from "../faturas/faturas.repository";

type FaturaResumo = { valor_total: number | string | null; status: string | null; referencia: string | null };

export async function carregarFinanceiro(empresaId: string, usinaId: string) {
  const { data: usina, error: erroUsina } = await supabase
    .from("usinas").select("id").eq("id", usinaId).eq("empresa_id", empresaId).maybeSingle();
  if (erroUsina) throw erroUsina;
  if (!usina) throw new Error("Usina não encontrada nesta empresa.");

  const faturas = await listarFaturas({ empresaId, usinaId }) as FaturaResumo[];
  const receitaPrevista = faturas.reduce((total, item) => total + Number(item.valor_total ?? 0), 0);
  const receitaRecebida = faturas
    .filter((item) => String(item.status ?? "").toUpperCase() === "PAGO")
    .reduce((total, item) => total + Number(item.valor_total ?? 0), 0);
  const agrupado: Record<string, number> = {};
  for (const fatura of faturas) {
    const competencia = String(fatura.referencia ?? "").trim();
    if (competencia) agrupado[competencia] = (agrupado[competencia] ?? 0) + Number(fatura.valor_total ?? 0);
  }
  const historicoMensal = Object.entries(agrupado)
    .map(([competencia, valor]) => ({ competencia, valor }))
    .sort((a, b) => {
      const [mesA, anoA] = a.competencia.split("/").map(Number);
      const [mesB, anoB] = b.competencia.split("/").map(Number);
      return new Date(anoA, mesA - 1).getTime() - new Date(anoB, mesB - 1).getTime();
    });

  return {
    receitaPrevista,
    receitaRecebida,
    valorEmAberto: receitaPrevista - receitaRecebida,
    inadimplentes: faturas.filter((item) => String(item.status ?? "").toUpperCase() !== "PAGO").length,
    ticketMedio: faturas.length ? receitaPrevista / faturas.length : 0,
    percentualRecebido: receitaPrevista ? (receitaRecebida / receitaPrevista) * 100 : 0,
    totalFaturas: faturas.length,
    historicoMensal,
  };
}
