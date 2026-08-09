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