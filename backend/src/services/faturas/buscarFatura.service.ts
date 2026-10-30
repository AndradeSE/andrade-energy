import { buscarFaturaPorId } from "../../repositories/faturas.repository";

export async function buscarFatura(id: string) {
  return buscarFaturaPorId(id);
}