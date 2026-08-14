import api from "../config/api";

export async function buscarDashboard(clienteId: string) {
  const { data } = await api.get("/dashboard/cliente", {
    params: {
      clienteId,
    },
  });

  console.log(
    "DASHBOARD_CLIENTE",
    JSON.stringify(data, null, 2)
  );

  return data;
}