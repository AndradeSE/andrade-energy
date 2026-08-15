import api from "../config/api";

export async function buscarDashboard(clienteId: string, uc?: string) {
  const { data } = await api.get("/dashboard/cliente", {
    params: {
      clienteId,
      ...(uc ? { uc } : {}),
    },
  });

  return data;
}
