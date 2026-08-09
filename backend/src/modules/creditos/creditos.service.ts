console.log("creditos.service carregado");

import { listarCreditos } from "./creditos.repository";

export async function obterCreditos(
  clienteId: string
) {
  return listarCreditos(clienteId);
}