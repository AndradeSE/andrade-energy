import api from "../config/api";

export async function criarConvite(payload: { nome: string; cpf: string; email: string; whatsapp?: string }) {
  const { data } = await api.post("/convites", payload);
  return data;
}

export async function consultarConvite(token: string) {
  const { data } = await api.get(`/convites/${encodeURIComponent(token)}`);
  return data;
}

export async function criarConviteGerador(payload: { nome: string; cpf: string; email: string }) {
  const { data } = await api.post("/convites/geradores", payload);
  return data;
}

export async function consultarConviteGerador(token: string) {
  const { data } = await api.get(`/convites/geradores/${encodeURIComponent(token)}`);
  return data;
}
