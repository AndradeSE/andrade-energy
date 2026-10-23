import api from "../config/api";

export type Carteira = {
  status: string;
  asaasConectado: boolean;
  transferenciaAutomatica: boolean;
  autenticadorAtivo: boolean;
  pixTipo?: string | null;
  pixChaveMascarada?: string | null;
  pixTitularNome?: string | null;
  saldoDisponivel: number;
  saldoDisponivelConfirmado?: boolean;
  saldoAsaas?: number | null;
  recebimentoBruto?: number;
  tarifasRecebimento?: number | null;
  recebimentoLiquido?: number | null;
  saldoPendente: number;
  totalRecebido: number;
  totalTransferido: number;
  cobrancas?: Array<Record<string, any>>;
  transferencias: Array<Record<string, any>>;
};

export async function carregarCarteira(usinaId?: string) { const { data } = await api.get("/carteira", { params: { usinaId } }); return data as Carteira; }
export async function salvarCarteira(payload: { usinaId?: string; pixTipo: string; pixChave?: string; pixTitularNome?: string; transferenciaAutomatica: boolean; senhaAtual: string; codigoAutenticador: string; autorizacaoPix?: string }) { const { data } = await api.put("/carteira", payload); return data as Carteira; }
export async function alterarTransferenciaAutomatica(ativa: boolean, usinaId?: string) { const { data } = await api.patch("/carteira/transferencia-automatica", { ativa, usinaId }); return data as Carteira; }
export async function validarChavePix(pixTipo: string, pixChave: string) { const { data } = await api.post("/carteira/validar-pix", { pixTipo, pixChave }); return data as { nome: string; cpfCnpj?: string; banco?: string }; }
export async function transferir(valor: number, senhaAtual: string, codigoAutenticador: string, usinaId?: string) { const chave = `saque-${Date.now()}-${Math.random().toString(36).slice(2)}`; const { data } = await api.post("/carteira/transferencias", { valor, senhaAtual, codigoAutenticador, usinaId, confirmacao: "TRANSFERIR" }, { headers: { "Idempotency-Key": chave } }); return data; }
