import api from "../config/api";

export async function listarFechamentos(usinaId?: string) {
  const { data } = await api.get("/fechamentos", { params: { usinaId } });
  return data;
}

export async function obterResumoOperacao(competencia?: string, usinaId?: string) {
  const { data } = await api.get("/fechamentos/resumo", { params: { competencia, usinaId } });
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
