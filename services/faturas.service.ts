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

export function formatarCompetenciaBrasileira(valor: unknown, fallback = "Período não informado") {
  const texto = String(valor ?? "").trim();
  if (!texto) return fallback;
  const competencia = /^(\d{4})-(\d{2})$/.exec(texto);
  if (competencia) return `${competencia[2]}/${competencia[1]}`;
  return formatarDataBrasileira(texto, fallback);
}

function numeroDaFatura(valor: unknown) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  const numero = Number(normalizado.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numero) ? numero : 0;
}

function consumoMensalValido(item: any) {
  const consumoExtraido = numeroDaFatura(item?.consumo ?? item?.consumo_kwh ?? item?.consumoKwh ?? item?.kwh ?? item?.valor);
  const dias = numeroDaFatura(item?.dias ?? item?.dias_faturados ?? item?.diasFaturados);
  const mediaDiaria = numeroDaFatura(item?.mediaDiaria ?? item?.media_diaria);
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
  const fonte = dados?.dadosFatura ?? dados?.dados_fatura ?? dados?.dadosExtraidos ?? dados?.dados_extraidos ?? dados;
  const historicoBruto = fonte?.historico ?? fonte?.historicoConsumo ?? fonte?.historico_consumo;
  const historico = Array.isArray(historicoBruto)
    ? historicoBruto.slice(0, 12)
    : [];
  const consumos = historico
    .map(consumoMensalValido)
    .filter((valor: number) => valor > 0);
  const media = consumos.length
    ? consumos.reduce((total: number, valor: number) => total + valor, 0) / consumos.length
    : numeroDaFatura(fonte?.consumo ?? fonte?.consumo_kwh ?? fonte?.consumoKwh ?? fonte?.consumoFaturado);

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

export async function criarFaturaManual(dados: Record<string, unknown>) {
  const { data } = await api.post("/faturas/manual/criar", dados);
  return data;
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

export async function obterRelatorioCalculoFatura(id: string): Promise<string> {
  const { data } = await api.get(`/faturas/${id}/relatorio-calculo`, { timeout: 60_000 });
  return String(data?.url ?? "");
}

export async function confirmarFaturaRascunho(id: string) {
  const { data } = await api.post(`/faturas/${id}/confirmar`);
  return data;
}

export async function gerarCobrancaAsaas(id: string, opcoes: { refaturar?: boolean } = {}) {
  const { data } = await api.post(`/asaas/cobrancas/${id}`, opcoes);
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
