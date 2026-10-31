import { chaveCompetencia } from "../dashboard/competencia.policy";
export type UcEsperada = {id:string;numero:string;cliente_id:string};
export function contratoElegivelParaRateio(contrato:any) {
  if(!["ATIVO","VIGENTE"].includes(String(contrato.status)))return false;
  const doc=contrato.dados_documento;
  if(doc?.assinatura_externa_pendente===true || (doc?.aceite_cliente_exigido===true&&!contrato.aceite_cliente_em))return false;
  return Boolean(contrato.aceite_cliente_em||contrato.contrato_assinado_url||contrato.status==="VIGENTE");
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
