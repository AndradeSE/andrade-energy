import {
    criarParticipacao,
    listarParticipacoes,
} from "./participacoes.repository";

export async function cadastrarParticipacao(
  usinaId: string,
  clienteId: string,
  percentual: number
) {
  return criarParticipacao(
    usinaId,
    clienteId,
    percentual
  );
}
export async function obterParticipacoes(
  usinaId: string
) {
  return listarParticipacoes(usinaId);
}