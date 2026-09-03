import api from "../config/api";

export async function listarFechamentos() {
  const { data } = await api.get("/fechamentos");
  return data;
}

export async function obterResumoOperacao(competencia?: string) {
  const { data } = await api.get("/fechamentos/resumo", { params: competencia ? { competencia } : undefined });
  return data;
}

export async function buscarFechamento(id: string) {
  const { data } = await api.get(`/fechamentos/${id}`);
  return data;
}

export async function fecharUsina(payload: any) {
  const { data } = await api.post("/fechamentos", payload);
  return data;
}
