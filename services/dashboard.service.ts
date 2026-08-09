import api from "../config/api";

export async function buscarDashboard(clienteId: string) {
  const { data } = await api.get(`/dashboard/${clienteId}`);

  return data;
}