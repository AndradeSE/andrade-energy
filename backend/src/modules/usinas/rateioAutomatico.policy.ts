import { chaveCompetencia } from "../dashboard/competencia.policy";
export type UcEsperada = {id:string;numero:string;cliente_id:string};
export function contratoElegivelParaRateio(contrato:any) {
  if(!["ATIVO","VIGENTE"].includes(String(contrato.status)))return false;
  const doc=contrato.dados_documento;
  if(doc?.assinatura_externa_pendente===true || (doc?.aceite_cliente_exigido===true&&!contrato.aceite_cliente_em))return false;
  return Boolean(contrato.aceite_cliente_em||contrato.contrato_assinado_url||contrato.status==="VIGENTE");
}
const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const faturaValida = (status: unknown) => !["RASCUNHO","CANCELADO","CANCELADA","ERRO","PROCESSANDO"].includes(String(status).toUpperCase());
const dataLocal = new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"});

function dia(valor?: string | null) {
  if (!valor) return "";
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return "";
  return valor.length === 10 ? valor : dataLocal.format(data);
}

export function unidadesElegiveisNoCiclo<T extends {id:string;numero:string;cliente_id?:string|null;created_at?:string|null}>(
  competencia: string, unidades: T[], contratos: any[], faturas: any[], exigirContrato = true,
): T[] {
  const anterior = new Date(competencia + "-01T00:00:00Z");
  anterior.setUTCMonth(anterior.getUTCMonth() - 1);
  const referenciaAnterior = anterior.toISOString().slice(0, 7);
  const leituras = new Map<string, Set<string>>();
  const chave = (cliente: unknown, numero: unknown) => JSON.stringify([cliente, digitos(numero)]);
  for (const fatura of faturas) {
    const leitura = dia(fatura.proxima_leitura);
    if (!faturaValida(fatura.status) || chaveCompetencia(fatura.referencia) !== referenciaAnterior || leitura.slice(0, 7) !== competencia) continue;
    const identificador = chave(fatura.cliente_id, fatura.numero_instalacao);
    const datas = leituras.get(identificador) ?? new Set<string>();
    datas.add(leitura);
    leituras.set(identificador, datas);
  }
  const inicios = new Map<string, string>();
  for (const contrato of contratos) {
    if (!contratoElegivelParaRateio(contrato)) continue;
    const inicio = [dia(contrato.vigencia_inicio), dia(contrato.aceite_cliente_em)].sort().at(-1) ?? "";
    const id = contrato.unidade_consumidora_id;
    const registrado = inicios.get(id);
    if (registrado === undefined || inicio < registrado) inicios.set(id, inicio);
  }
  return unidades.filter(uc => {
    const contrato = inicios.get(uc.id);
    if (exigirContrato && (!uc.cliente_id || contrato === undefined)) return false;
    const cadastro = dia(uc.created_at);
    const entrada = cadastro > (contrato ?? "") ? cadastro : contrato ?? "";
    if (entrada.slice(0, 7) > competencia) return false;
    const datas = leituras.get(chave(uc.cliente_id, uc.numero));
    const leitura = datas?.size === 1 ? datas.values().next().value : undefined;
    return !leitura || entrada <= leitura;
  });
}

export function competenciaRateioCompleta(competencia:string,unidades:UcEsperada[],faturas:any[],producoes:any[]) {
  if(!unidades.length || unidades.some(u=>!u.cliente_id) || !producoes.some(p=>chaveCompetencia(p.competencia)===competencia && Number(p.energia_gerada)>0 && !!p.fatura_usina_validada_em && Number(p.energia_gerada_fatura)===Number(p.energia_gerada)))return false;
  const digitos=(v:unknown)=>String(v??"").replace(/\D/g,"");
  return unidades.every(u=>faturas.some(f=>chaveCompetencia(f.referencia)===competencia && digitos(f.numero_instalacao)===digitos(u.numero)
    && f.cliente_id===u.cliente_id && !["RASCUNHO","CANCELADO","CANCELADA","ERRO","PROCESSANDO"].includes(String(f.status).toUpperCase())));
}


/** Anexo de cadastro não comprova faturamento. Apenas importação concluída
 * durante suspensão pode fechar uma UC sem emitir cobrança. */
export function recebimentosSuspensosParaFechamento(recebimentos:any[], empresa:string, usina:string) {
  return recebimentos.flatMap(r=>{
    const unidade=Array.isArray(r.unidades_consumidoras)?r.unidades_consumidoras[0]:r.unidades_consumidoras;
    const meta=r.payload?.andrade_processamento;
    if(r.empresa_id!==empresa || r.status!=='PROCESSADO' || meta?.tipo!=='FATURAMENTO_SUSPENSO'
      || !r.unidade_consumidora_id || unidade?.usina_id!==usina || !unidade?.cliente_id || !unidade?.numero || !meta.competencia)return [];
    return [{cliente_id:unidade.cliente_id,numero_instalacao:unidade.numero,referencia:meta.competencia,status:'PROCESSADO'}];
  });
}
