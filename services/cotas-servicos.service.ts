import api from "../config/api";
export type QuotaService = {
  saldoDisponivel?: number | null;
  servico: string; metrica: string; rotulo: string; unidade: string; automatico: boolean; observacao?: string;
  consulta: { status: string; consultado_em: string } | null;
  leitura: { usado: number; limite: number | null; restante: number | null; percentual: number | null;
    origem: string; renova_em: string | null; verificado_em: string; desatualizada: boolean } | null;
};
export type ServiceQuotas = { ambiente: string; alertas: number[]; servicos: QuotaService[];
  reservaDados?: { banco: 'SUPABASE' | 'NEON'; modo: 'PRINCIPAL' | 'SOMENTE_LEITURA'; reservaConfigurada: boolean;
    prontaParaConsulta?: boolean; ultimaCopia?: string | null; documentosProntos?: boolean; consultaIndisponivel?: boolean;
    trocaAutomatica: boolean; limitacao?: string };
};
export async function listServiceQuotas() {
  return (await api.get<ServiceQuotas>("/cotas-servicos", { timeout: 35_000, params: { catalogo: 3 } })).data;
}
export async function refreshServiceQuotas() {
  return (await api.post<ServiceQuotas>("/cotas-servicos/atualizar", {}, { timeout: 35_000, params: { catalogo: 3 } })).data;
}
