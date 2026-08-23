import api from "../config/api";

export type Fatura = {
  id: string;
  [campo: string]: any;
};

export function formatarDataBrasileira(valor: unknown, fallback = "Não informado") {
  const texto = String(valor ?? "").trim();
  if (!texto) return fallback;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(texto);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
}

function consumoMensalValido(item: any) {
  const consumoExtraido = Number(item?.consumo ?? 0);
  const dias = Number(item?.dias ?? 0);
  const mediaDiaria = Number(item?.mediaDiaria ?? 0);
  const consumoPelaMedia = mediaDiaria > 0 && dias > 0
    ? Math.round(mediaDiaria * dias)
    : 0;

  if (!Number.isFinite(consumoExtraido) || consumoExtraido < 0) return 0;

  return consumoPelaMedia > 0 && consumoExtraido > consumoPelaMedia * 2
    ? consumoPelaMedia
    : consumoExtraido;
}

/**
 * Calcula a média mensal a partir dos últimos doze registros da conta.
 * Quando a fatura não traz histórico, usa o consumo do mês atual como
 * sugestão para que o gestor possa confirmar ou editar antes de alocar.
 */
export function calcularMediaConsumoFatura(dados: any) {
  const historico = Array.isArray(dados?.historico)
    ? dados.historico.slice(0, 12)
    : [];
  const consumos = historico
    .map(consumoMensalValido)
    .filter((valor: number) => valor > 0);
  const media = consumos.length
    ? consumos.reduce((total: number, valor: number) => total + valor, 0) / consumos.length
    : Number(dados?.consumo ?? 0);

  return Number.isFinite(media) && media > 0
    ? Math.round(media)
    : 0;
}

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

export async function listarFaturas(clienteId?: string, uc?: string): Promise<Fatura[]> {
  const { data } = await api.get("/faturas", {
    params: { ...(clienteId ? { clienteId } : {}), ...(uc ? { uc } : {}) },
  });

  return Array.isArray(data) ? data as Fatura[] : [];
}

export async function buscarFaturasCliente(
  uc: string
): Promise<Fatura[]> {
  const { data } = await api.get("/faturas", {
    params: {
      uc,
    },
  });

  return Array.isArray(data) ? data as Fatura[] : [];
}

export async function buscarFatura(id: string) {
  const { data } = await api.get(`/faturas/${id}`);
  return data;
}

export async function excluirFatura(id: string) {
  const { data } = await api.delete(`/faturas/${id}`);
  return data;
}

export async function regenerarDocumentosFatura(id: string) {
  const { data } = await api.post(`/faturas/${id}/regenerar-documentos`);
  return data;
}

export async function confirmarFaturaRascunho(id: string) {
  const { data } = await api.post(`/faturas/${id}/confirmar`);
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
