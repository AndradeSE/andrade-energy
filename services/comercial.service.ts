import api from "../config/api";

export type PainelComercial = {
  resumo: { total: number; ativas: number; inadimplentes: number; receitaMensalPrevista: number };
  financeiro: { competencia: string; recebidoNoMes: number; pendenteNoMes: number; vencidoNoMes: number; totalRecebido: number; cobrancasPendentes: number; cobrancasVencidas: number };
  planos: any[];
  assinaturas: any[];
  cobrancas: any[];
  documentos: any[];
  geradores: any[];
};

export const obterPainelComercial = async () => (await api.get<PainelComercial>("/comercial/painel")).data;
export const contratarPlano = async (payload: any) => (await api.post("/comercial/assinaturas", payload)).data;
export const alterarStatusAssinatura = async (id: string, status: string) => (await api.patch(`/comercial/assinaturas/${id}/status`, { status })).data;
export const gerarCobrancaAssinatura = async (id: string) => (await api.post(`/comercial/assinaturas/${id}/cobrancas`)).data;
export const obterMinhaAssinatura = async () => (await api.get("/comercial/minha-assinatura")).data;
export const criarCheckoutAssinatura = async (formasPagamento: string[] = ["CREDIT_CARD"]) => (await api.post("/comercial/minha-assinatura/checkout", { formasPagamento })).data;
