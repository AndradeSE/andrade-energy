import api from "../config/api";

export async function buscarContrato(
  clienteId: string
) {
  const { data } = await api.get(
    `/contratos/${clienteId}`
  );

  return data;
}

export async function criarContrato(
  payload: any
) {
  const { data } = await api.post(
    "/contratos",
    payload
  );

  return data;
}

export async function atualizarContrato(
  id: string,
  payload: any
) {
  const { data } = await api.put(
    `/contratos/${id}`,
    payload
  );

  return data;
}

export async function excluirContrato(
  id: string
) {
  const { data } = await api.delete(
    `/contratos/${id}`
  );

  return data;
}

export async function cancelarContrato(id: string) {
  const { data } = await api.post(`/contratos/${id}/cancelar`);
  return data;
}

export async function buscarContratoDaUnidade(
  unidadeId: string
) {
  const { data } = await api.get(
    `/contratos/unidade/${unidadeId}`
  );

  return data;
}

export async function salvarContratoDaUnidade(
  unidadeId: string,
  payload: any
) {
  const { data } = await api.put(
    `/contratos/unidade/${unidadeId}`,
    payload
  );

  return data;
}

export async function gerarContratoDaUnidade(unidadeId: string, payload: any) {
  const { data } = await api.post(`/contratos/unidade/${unidadeId}/gerar-documento`, payload);
  return data;
}

export async function importarContratoAssinadoDaUnidade(unidadeId: string, arquivo: { uri: string; name: string; mimeType?: string | null }) {
  const form = new FormData();
  form.append("arquivo", {
    uri: arquivo.uri,
    name: arquivo.name,
    type: arquivo.mimeType || "application/pdf",
  } as any);
  const { data } = await api.post(`/contratos/unidade/${unidadeId}/contrato-assinado`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
