import api from "../config/api";

export type ClimaUsina = {
  disponivel: boolean; tipo?: "sol" | "nublado" | "chuva" | "noite";
  descricao?: string; temperatura?: number; noite?: boolean;
  regiao?: string; fuso?: string; referencia?: string; consultadoEm?: string; motivo?: string;
};
export async function buscarClimaUsina(id: string): Promise<ClimaUsina> {
  const { data } = await api.get(`/usinas/${encodeURIComponent(id)}/clima`, { timeout: 20_000 });
  return data;
}
