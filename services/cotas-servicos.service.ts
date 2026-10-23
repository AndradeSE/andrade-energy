import api from "../config/api";
export type QuotaService = {
  servico: string; metrica: string; rotulo: string; unidade: string; automatico: boolean;
  consulta: { status: string; consultado_em: string } | null;
  leitura: { usado: number; limite: number | null; restante: number | null; percentual: number | null;
    origem: string; renova_em: string; verificado_em: string; desatualizada: boolean } | null;
};
export type ServiceQuotas = { ambiente: string; alertas: number[]; servicos: QuotaService[] };
export async function listServiceQuotas() {
  return (await api.get<ServiceQuotas>("/cotas-servicos", { timeout: 20_000, params: { catalogo: 2 } })).data;
}
export async function refreshServiceQuotas() {
  return (await api.post<ServiceQuotas>("/cotas-servicos/atualizar", {}, { timeout: 25_000, params: { catalogo: 2 } })).data;
}
export async function registerQuotaReading(input: { servico: string; metrica: string; usado: number; limite: number; validaAte: string; confirmado: boolean }) {
  return (await api.post<ServiceQuotas>("/cotas-servicos/leitura-confirmada", input, { timeout: 20_000, params: { catalogo: 2 } })).data;
}
