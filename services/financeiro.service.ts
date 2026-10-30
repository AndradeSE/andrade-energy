import api from "../config/api";

export type ResumoFinanceiro = {
  receitaPrevista: number;
  receitaRecebida: number;
  valorEmAberto: number;
  inadimplentes: number;
  ticketMedio: number;
  percentualRecebido: number;
  totalFaturas: number;
  historicoMensal: { competencia: string; valor: number }[];
};

export async function carregarFinanceiro(usinaId?: string): Promise<ResumoFinanceiro> {
  const { data } = await api.get<ResumoFinanceiro>("/carteira/resumo-faturas", { params: { usinaId } });
  return data;
}
