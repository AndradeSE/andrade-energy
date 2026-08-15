import api from "../config/api";

export async function criarConvite(payload: { nome: string; cpf: string; email: string }) {
  const { data } = await api.post("/convites", payload);
  return data;
}

export async function consultarConvite(token: string) {
  const { data } = await api.get(`/convites/${encodeURIComponent(token)}`);
  return data;
}
