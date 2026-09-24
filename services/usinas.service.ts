import api from "../config/api";

export async function listarUsinas() {
  const { data } = await api.get("/usinas");
  return data;
}

export async function buscarUsina(id: string) {
  const { data } = await api.get(`/usinas/${id}`);
  return data;
}

export async function criarUsina(payload: any) {
  const { data } = await api.post("/usinas", payload);
  return data;
}

export async function editarUsina(id: string, payload: any) {
  const { data } = await api.put(`/usinas/${id}`, payload);
  return data;
}
export async function excluirUsina(id: string) {
  await api.delete(`/usinas/${id}`);
}

export async function migrarUnidadesDaUsina(id: string, destinoUsinaId: string) {
  const { data } = await api.post(`/usinas/${id}/migrar-unidades`, { destinoUsinaId });
  return data;
}
export async function buscarDashboardUsina(
  id: string
) {
  const { data } =
    await api.get(`/usinas/${id}/dashboard`);

  return data;
}

export async function importarFaturaGeradora(id: string, uri: string, nome = "fatura-geradora.pdf", senhaPdf?: string) {
  const formData = new FormData();
  formData.append("arquivo", { uri, name: nome, type: "application/pdf" } as any);
  if (senhaPdf?.trim()) formData.append("senhaPdf", senhaPdf.trim());
  const { data } = await api.post(`/usinas/${id}/importar-fatura`, formData, { timeout: 60_000 });
  return data;
}

export async function alocarUnidade(id: string, payload: any) {
  const { data } = await api.post(`/usinas/${id}/alocar-unidade`, payload);
  return data;
}

export async function consultarAlocacao(id: string, unidadeId?: string): Promise<{ reservado: number; disponivel: number }> {
  const { data } = await api.get(`/usinas/${id}/alocacao`, { params: unidadeId ? { unidadeId } : {} });
  return data;
}

export async function listarInversoresDaUsina(id: string) {
  const { data } = await api.get(`/usinas/${id}/inversores`);
  return data;
}

export async function cadastrarInversorNaUsina(id: string, payload: any) {
  const { data } = await api.post(`/usinas/${id}/inversores`, payload);
  return data;
}

export async function excluirInversorDaUsina(id: string, integracaoId: string) {
  const { data } = await api.delete(`/usinas/${id}/inversores/${integracaoId}`);
  return data;
}
