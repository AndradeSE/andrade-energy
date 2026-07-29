import { API } from "../config/api";
export async function buscarDashboard(clienteId: string) {
  const response = await fetch(
    `${API}/dashboard/${clienteId}`
  );

  if (!response.ok) {
    throw new Error("Erro ao carregar dashboard");
  }

  return response.json();
}