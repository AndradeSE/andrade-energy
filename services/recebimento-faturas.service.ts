import api from "../config/api";

export type StatusRecebimentoFaturas = {
  configurado: boolean;
  dominio: string;
  ativo: boolean;
  endereco: string | null;
  ativadoEm: string | null;
  ultimoRecebimentoEm: string | null;
  status: string;
  erro: string | null;
  faturaId: string | null;
};

export async function obterRecebimentoFaturas(unidadeId: string) {
  const { data } = await api.get<StatusRecebimentoFaturas>(`/recebimento-faturas/unidades/${unidadeId}`);
  return data;
}

export async function ativarRecebimentoFaturas(unidadeId: string) {
  const { data } = await api.post<StatusRecebimentoFaturas>(`/recebimento-faturas/unidades/${unidadeId}/ativar`);
  return data;
}

export async function regenerarEnderecoRecebimento(unidadeId: string) {
  const { data } = await api.post<StatusRecebimentoFaturas>(`/recebimento-faturas/unidades/${unidadeId}/regenerar`);
  return data;
}

export async function desativarRecebimentoFaturas(unidadeId: string) {
  const { data } = await api.post<StatusRecebimentoFaturas>(`/recebimento-faturas/unidades/${unidadeId}/desativar`);
  return data;
}
