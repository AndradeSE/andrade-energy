import api from "../config/api";

export async function listarNotificacoesApp() {
  const { data } = await api.get("/notificacoes");
  return data as { id: string; tipo: string; titulo: string; detalhe?: string; rota?: string; criado_em: string }[];
}
