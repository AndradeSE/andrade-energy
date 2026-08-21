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
  finalidade?: "FATURA_CONSUMIDOR" | "PRODUCAO_USINA";
  producao?: {
    tipo?: "PRODUCAO_USINA";
    usinaId?: string;
    fechamentoId?: string;
    competencia?: string | null;
    energiaGerada?: number | null;
  } | null;
  unidade?: {
    id: string;
    numero: string;
    tipo?: string | null;
    usinaId?: string | null;
  } | null;
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

export type ConfirmacaoEncaminhamentoGmail = {
  url: string | null;
  recebidoEm: string | null;
};

export async function obterConfirmacaoEncaminhamentoGmail(unidadeId: string) {
  const { data } = await api.get<ConfirmacaoEncaminhamentoGmail>(`/recebimento-faturas/unidades/${unidadeId}/confirmacao-gmail`);
  return data;
}
