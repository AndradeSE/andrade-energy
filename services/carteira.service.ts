import api from "../config/api";

export type Carteira = {
  status: string;
  asaasConectado: boolean;
  transferenciaAutomatica: boolean;
  pixTipo?: string | null;
  pixChaveMascarada?: string | null;
  pixTitularNome?: string | null;
  saldoDisponivel: number;
  saldoPendente: number;
  totalRecebido: number;
  totalTransferido: number;
  transferencias: Array<Record<string, any>>;
};

export async function carregarCarteira() { const { data } = await api.get("/carteira"); return data as Carteira; }
export async function salvarCarteira(payload: { pixTipo: string; pixChave?: string; pixTitularNome?: string; transferenciaAutomatica: boolean; senhaAtual: string }) { const { data } = await api.put("/carteira", payload); return data as Carteira; }
export async function validarChavePix(pixTipo: string, pixChave: string) { const { data } = await api.post("/carteira/validar-pix", { pixTipo, pixChave }); return data as { nome: string; cpfCnpj?: string; banco?: string }; }
export async function transferir(valor: number, senhaAtual: string) { const chave = `saque-${Date.now()}-${Math.random().toString(36).slice(2)}`; const { data } = await api.post("/carteira/transferencias", { valor, senhaAtual, confirmacao: "TRANSFERIR" }, { headers: { "Idempotency-Key": chave } }); return data; }
