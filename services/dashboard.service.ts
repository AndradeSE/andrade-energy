import api from "../config/api";

export async function buscarDashboard(clienteId: string, uc?: string) {
  const { data } = await api.get("/dashboard/cliente", {
    timeout: 60000,
    params: {
      clienteId,
      ...(uc ? { uc } : {}),
    },
  });

  return data;
}
