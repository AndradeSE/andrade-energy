import api from "../config/api";

export type PainelComercial = {
  resumo: { total: number; ativas: number; inadimplentes: number; receitaMensalPrevista: number };
  planos: any[];
  assinaturas: any[];
  documentos: any[];
  geradores: any[];
};

export const obterPainelComercial = async () => (await api.get<PainelComercial>("/comercial/painel")).data;
export const contratarPlano = async (payload: any) => (await api.post("/comercial/assinaturas", payload)).data;
export const alterarStatusAssinatura = async (id: string, status: string) => (await api.patch(`/comercial/assinaturas/${id}/status`, { status })).data;
export const gerarCobrancaAssinatura = async (id: string) => (await api.post(`/comercial/assinaturas/${id}/cobrancas`)).data;
