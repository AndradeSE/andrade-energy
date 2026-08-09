import api from "../config/api";

export async function listarCreditos(clienteId: string) {
  const { data } = await api.get(`/creditos/${clienteId}`);
  return data;
}