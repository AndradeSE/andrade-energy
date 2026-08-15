import api from "../config/api";

async function enviarPdf(uri: string, endpoint: string, nome = "fatura.pdf") {
  const formData = new FormData();
  formData.append("arquivo", {
    uri,
    name: nome,
    type: "application/pdf",
  } as any);

  const { data } = await api.post(endpoint, formData, { timeout: 60_000 });

  return data;
}

export async function processarFatura(uri: string, nome?: string) {
  return enviarPdf(uri, "/faturas/importar", nome);
}

export async function analisarFatura(uri: string, nome?: string) {
  return enviarPdf(uri, "/faturas/analisar", nome);
}

export async function salvarImportacao(uri: string) {
  return processarFatura(uri);
}

export async function listarFaturas(clienteId?: string, uc?: string) {
  const { data } = await api.get("/faturas", {
    params: { ...(clienteId ? { clienteId } : {}), ...(uc ? { uc } : {}) },
  });

  return data;
}

export async function buscarFaturasCliente(
  uc: string
) {
  const { data } = await api.get("/faturas", {
    params: {
      uc,
    },
  });

  return data;
}

export async function buscarFatura(id: string) {
  const { data } = await api.get(`/faturas/${id}`);
  return data;
}

export async function excluirFatura(id: string) {
  const { data } = await api.delete(`/faturas/${id}`);
  return data;
}

export async function atualizarFatura(
  id: string,
  payload: any
) {
  const { data } = await api.put(
    `/faturas/${id}`,
    payload
  );

  return data;
}
