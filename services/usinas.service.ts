import api from "../config/api";
import {sendPdf} from './pdf-transport';

export type SaldoAncora={uc:string;saldoKwh:number|null;referencia:string|null};
export type UcAncoraCadastrada={id:string;numero:string;apelido:string};
export async function listarUcsAncoras(id:string){return (await api.get(`/usinas/${id}/ucs-ancoras`,{timeout:15000})).data as UcAncoraCadastrada[];}
export async function salvarUcAncora(id:string,dados:{numero:string;apelido:string},ancoraId?:string){return (await (ancoraId?api.put(`/usinas/${id}/ucs-ancoras/${ancoraId}`,dados):api.post(`/usinas/${id}/ucs-ancoras`,dados))).data as UcAncoraCadastrada;}
export async function excluirUcAncora(id:string,ancoraId:string){await api.delete(`/usinas/${id}/ucs-ancoras/${ancoraId}`);}
export async function obterSaldoAncora(id:string,uc:string,competencia:string){return (await api.get(`/usinas/${id}/saldo-ancora`,{params:{uc,competencia},timeout:15000})).data as SaldoAncora;}

export async function gerarPlanilhaRateio(id: string, competencia: string, ucAncora: string, enviarEmail = false, opcoes: {documentoAncora?:string;numerosAtuaisConfirmados?:boolean;formatoCemig?:boolean} = {}) {
  const {data} = await api.post(`/usinas/${id}/rateio-mensal`,{competencia,ucAncora,enviarEmail,...opcoes},{timeout:60000});
  return data as {arquivo:string; csv:string; rascunho:boolean; formatoCemig:boolean; pendencias:string[]; saldosSemHistorico:number; suspensas:Array<{uc:string;consumoMedio:number;saldo:number}>; emailEnviado:boolean; mesesNaMedia:number; producaoMedia:number; ucsExcluidas:number; linhas:Array<{uc:string;percentual:number;energiaPrevista:number;ancora:boolean}>};
}

export type ConfiguracaoRateio={uc_ancora:string;numeros_confirmados:boolean;habilitado:boolean;registros:Array<{competencia:string;status:string;email_status:string;erro?:string}>};
export async function obterConfiguracaoRateio(id:string){return (await api.get(`/usinas/${id}/rateio-configuracao`,{timeout:15000})).data as ConfiguracaoRateio;}
export async function salvarConfiguracaoRateio(id:string,ucAncora:string,numerosAtuaisConfirmados:boolean){return (await api.put(`/usinas/${id}/rateio-configuracao`,{ucAncora,numerosAtuaisConfirmados})).data as ConfiguracaoRateio;}
export async function buscarRateioAutomatico(id:string,competencia:string){return (await api.get(`/usinas/${id}/rateios-mensais/${competencia}`,{timeout:15000})).data as Awaited<ReturnType<typeof gerarPlanilhaRateio>>;}

export async function listarUsinas() {
  const { data } = await api.get("/usinas", { timeout: 60000 });
  return data;
}

export async function buscarUsina(id: string) {
  const { data } = await api.get(`/usinas/${id}`);
  return data;
}

export async function criarUsina(payload: any) {
  const { data } = await api.post("/usinas", payload);
  return data;
}
export async function cadastrarUnidadeOperacional(id: string, payload: any) {
  const { data } = await api.post(`/usinas/${id}/unidades`, payload);
  return data;
}

export async function editarUsina(id: string, payload: any) {
  const { data } = await api.put(`/usinas/${id}`, payload);
  return data;
}
export async function excluirUsina(id: string) {
  await api.delete(`/usinas/${id}`);
}

export async function migrarUnidadesDaUsina(id: string, destinoUsinaId: string) {
  const { data } = await api.post(`/usinas/${id}/migrar-unidades`, { destinoUsinaId });
  return data;
}
export async function buscarDashboardUsina(
  id: string
) {
  const { data } =
    await api.get(`/usinas/${id}/dashboard`, { timeout: 60000 });

  return data;
}

export async function importarFaturaGeradora(id: string, uri: string, nome = "fatura-geradora.pdf", senhaPdf?: string) {
  return sendPdf(uri,`/usinas/${id}/importar-fatura`,nome,senhaPdf?.trim()?{senhaPdf:senhaPdf.trim()}:{});
}

export async function importarProducaoPelaUc(uri: string, nome = "fatura-geradora.pdf", senhaPdf?: string) {
  return sendPdf(uri,'/usinas/importar-producao-pdf',nome,senhaPdf?.trim()?{senhaPdf:senhaPdf.trim()}:{});
}

export async function alocarUnidade(id: string, payload: any) {
  const { data } = await api.post(`/usinas/${id}/alocar-unidade`, payload);
  return data;
}

export async function consultarAlocacao(id: string, unidadeId?: string): Promise<{ reservado: number; disponivel: number }> {
  const { data } = await api.get(`/usinas/${id}/alocacao`, { timeout: 60000, params: unidadeId ? { unidadeId } : {} });
  return data;
}

export async function listarInversoresDaUsina(id: string) {
  const { data } = await api.get(`/usinas/${id}/inversores`);
  return data;
}

export async function cadastrarInversorNaUsina(id: string, payload: any) {
  const { data } = await api.post(`/usinas/${id}/inversores`, payload);
  return data;
}

export async function excluirInversorDaUsina(id: string, integracaoId: string) {
  const { data } = await api.delete(`/usinas/${id}/inversores/${integracaoId}`);
  return data;
}
