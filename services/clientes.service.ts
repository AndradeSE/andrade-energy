import api from "../config/api";

export async function listarClientes() {
  const { data } = await api.get("/clientes");
  return data;
}

export async function buscarCliente(id: string) {
  const { data } = await api.get(`/clientes/${id}`);
  return data;
}

export async function criarCliente(payload: any) {
  const { data } = await api.post("/clientes", payload);
  return data;
}

export async function editarCliente(id: string, payload: any) {
  const { data } = await api.put(`/clientes/${id}`, payload);
  return data;
}

export async function excluirCliente(id: string) {
  await api.delete(`/clientes/${id}`);
}

export async function listarUnidadesCliente(id: string) {
  const { data } = await api.get(`/clientes/${id}/unidades`);
  return data;
}

export async function listarUnidadesGestor() {
  const { data } = await api.get("/clientes/unidades");
  return data;
}

export async function buscarUnidade(id: string) {
  const { data } = await api.get(`/clientes/unidade/${id}`);
  return data;
}

export async function cadastrarUnidadeCliente(id: string, numero: string, cpfTitular?: string) {
  const { data } = await api.post(`/clientes/${id}/unidades`, { numero, cpfTitular });
  return data;
}

export async function excluirUnidadeCliente(unidadeId: string) {
  await api.delete(`/clientes/unidade/${unidadeId}`);
}

export type SolicitacaoCadastroCliente = {
  id: string;
  status: "AGUARDANDO_VERIFICACAO_EMAIL" | "AGUARDANDO_CONFIRMACAO_GERADOR" | "ATIVO" | "REJEITADO" | string;
  dadosFatura: {
    titular?: string;
    endereco?: string;
    uc?: string;
    cpfParcial?: string;
    classificacao?: string;
    tensao?: string;
    distribuidora?: string;
  };
  emailVerificadoEm?: string | null;
  confirmadoEm?: string | null;
  criadoEm?: string;
  faturaUrl?: string | null;
};

export async function obterSolicitacaoCadastroCliente(id: string) {
  const { data } = await api.get(`/clientes/${id}/solicitacao-cadastro`);
  return data as SolicitacaoCadastroCliente;
}

export async function confirmarCadastroCliente(id: string) {
  const { data } = await api.post(`/clientes/${id}/confirmar-cadastro`);
  return data;
}

export async function listarMinhasUnidades() {
  const { data } = await api.get("/clientes/minhas-unidades");
  return data;
}
