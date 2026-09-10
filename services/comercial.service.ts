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
export const salvarPlanoComercial = async (id: string | undefined, payload: any) =>
  (await api[id ? "put" : "post"](id ? `/comercial/planos/${id}` : "/comercial/planos", payload)).data;
export const obterFinanceiroAssinaturas = async () => (await api.get("/comercial/financeiro")).data;
export const configurarFinanceiroAssinaturas = async (payload:any) => (await api.put("/comercial/financeiro",payload)).data;
export const transferirFinanceiroAssinaturas = async (valor:number,senhaAtual:string) => (await api.post("/comercial/financeiro/transferencias",{valor,senhaAtual,confirmacao:"TRANSFERIR"},{headers:{"Idempotency-Key":`assinaturas-${Date.now()}`}})).data;
export const contratarPlano = async (payload: any) => (await api.post("/comercial/assinaturas", payload)).data;
export const alterarStatusAssinatura = async (id: string, status: string) => (await api.patch(`/comercial/assinaturas/${id}/status`, { status })).data;
export const gerarCobrancaAssinatura = async (id: string) => (await api.post(`/comercial/assinaturas/${id}/cobrancas`)).data;
export const obterMinhaAssinatura = async () => (await api.get("/comercial/minha-assinatura")).data;
export const criarCheckoutAssinatura = async (
  formasPagamento: string[] = ["CREDIT_CARD"],
  opcoes: { parcelamentoAnual?: boolean; parcelas?: number } = {},
) =>
  (
    await api.post("/comercial/minha-assinatura/checkout", {
      formasPagamento,
      ...opcoes,
    })
  ).data;
export const removerGerador = async (id: string) => (await api.delete(`/usuarios/geradores/${id}`)).data;
