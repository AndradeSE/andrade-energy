import { listarFaturasPorCliente } from "../../repositories/faturas.repository";

export async function listarFaturas(
  clienteId: string
) {
  return listarFaturasPorCliente(clienteId);
}