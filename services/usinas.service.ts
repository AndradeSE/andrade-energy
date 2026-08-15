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
export async function buscarDashboardUsina(
  id: string
) {
  const { data } =
    await api.get(`/usinas/${id}/dashboard`);

  return data;
}

export async function importarFaturaGeradora(id: string, uri: string, nome = "fatura-geradora.pdf") {
  const formData = new FormData();
  formData.append("arquivo", { uri, name: nome, type: "application/pdf" } as any);
  const { data } = await api.post(`/usinas/${id}/importar-fatura`, formData, { timeout: 60_000 });
  return data;
}
