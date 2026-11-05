import api from "../config/api";
import {sendPdf} from './pdf-transport';

export async function listarClientes(usinaId?: string) {
  const { data } = await api.get("/clientes", { params: usinaId ? { usinaId } : {} });
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

export async function listarUnidadesGestor(usinaId?: string) {
  const { data } = await api.get("/clientes/unidades", { timeout: 60000, params: usinaId ? { usinaId } : {} });
  return data;
}

export async function buscarUnidade(id: string) {
  const { data } = await api.get(`/clientes/unidade/${id}`, { timeout: 15000 });
  return data;
}

export async function registrarAutoleitura(id: string, leitura: string, fotoBase64?: string) {
  await api.post(`/clientes/minhas-unidades/${id}/autoleitura`, { leitura, fotoBase64 });
}

export async function listarAutoleituras(id: string) {
  const { data } = await api.get<{ id: string; data_programada: string; leitura_kwh: number; recebida_em: string; estado: "RECEBIDA" | "EM_ENVIO" | "ENVIADA" | "RECUSADA" | "EM_REVISAO"; protocolo_cemig: string | null; estimativa_cemig: number | null }[]>(
    `/clientes/unidade/${id}/autoleitura`,
  );
  return data;
}

export async function listarMinhasAutoleituras(id: string) {
  const { data } = await api.get<{ id: string; data_programada: string; leitura_kwh: number; recebida_em: string; estado: "RECEBIDA" | "EM_ENVIO" | "ENVIADA" | "RECUSADA" | "EM_REVISAO"; protocolo_cemig: string | null; estimativa_cemig: number | null }[]>(
    `/clientes/minhas-unidades/${id}/autoleitura`,
  );
  return data;
}

export async function configurarAutoleitura(id: string, zona: "RURAL" | "URBANA", ativa: boolean) {
  await api.patch(`/clientes/unidade/${id}/autoleitura`, {
    zona_localizacao: zona,
    autoleitura_rural_ativa: ativa,
  });
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

export type FaturaAnexadaCliente = {
  id: string;
  nome: string;
  dadosFatura: Record<string, any>;
  criadoEm: string;
  url: string;
  unidade?: { id: string; numero: string; usina_id?: string | null; ja_existia?: boolean };
};

export async function listarFaturasAnexadasCliente(id: string) {
  const { data } = await api.get(`/clientes/${id}/faturas-anexadas`);
  return data as FaturaAnexadaCliente[];
}

export async function anexarFaturaCliente(id: string, arquivo: { uri: string; name: string; mimeType?: string | null }, senhaPdf?: string, usinaId?: string, zonaSolicitada?: "RURAL" | "URBANA") {
  return await sendPdf(arquivo.uri,`/clientes/${id}/${zonaSolicitada ? "solicitacao-nova-uc" : "faturas-anexadas"}`,arquivo.name||'fatura-cemig.pdf',{
    ...(senhaPdf?.trim()?{senhaPdf:senhaPdf.trim()}:{}),...(usinaId?{usinaId}:{}),...(zonaSolicitada?{zonaSolicitada}:{})
  }) as FaturaAnexadaCliente;
}

export async function excluirFaturaAnexadaCliente(clienteId: string, anexoId: string) {
  await api.delete(`/clientes/${clienteId}/faturas-anexadas/${anexoId}`);
}

export async function listarMinhasUnidades() {
  const { data } = await api.get("/clientes/minhas-unidades");
  return data;
}

export async function nomearMinhaUnidade(unidadeId: string, apelido: string) {
  const { data } = await api.patch(`/clientes/minhas-unidades/${unidadeId}/apelido`, { apelido });
  return data;
}
