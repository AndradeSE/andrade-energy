import api from "../config/api";

export type Carteira = {
  status: string;
  asaasConectado: boolean;
  transferenciaAutomatica: boolean;
  pixTipo?: string | null;
  pixChaveMascarada?: string | null;
  saldoDisponivel: number;
  saldoPendente: number;
  totalRecebido: number;
  totalTransferido: number;
  transferencias: Array<Record<string, any>>;
};

export async function carregarCarteira() { const { data } = await api.get("/carteira"); return data as Carteira; }
export async function salvarCarteira(payload: { pixTipo: string; pixChave?: string; transferenciaAutomatica: boolean }) { const { data } = await api.put("/carteira", payload); return data as Carteira; }
export async function transferir(valor: number) { const { data } = await api.post("/carteira/transferencias", { valor, confirmacao: "TRANSFERIR" }); return data; }
