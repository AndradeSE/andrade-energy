import { chaveCompetencia } from "../dashboard/competencia.policy";
export type UcEsperada = {id:string;numero:string;cliente_id:string};
export function contratoElegivelParaRateio(contrato:any) {
  if(!["ATIVO","VIGENTE"].includes(String(contrato.status)))return false;
  const doc=contrato.dados_documento;
  if(doc?.assinatura_externa_pendente===true || (doc?.aceite_cliente_exigido===true&&!contrato.aceite_cliente_em))return false;
  return Boolean(contrato.aceite_cliente_em||contrato.contrato_assinado_url||contrato.status==="VIGENTE");
}
export function competenciaRateioCompleta(competencia:string,unidades:UcEsperada[],faturas:any[],producoes:any[]) {
  if(!unidades.length || !producoes.some(p=>chaveCompetencia(p.competencia)===competencia && Number(p.energia_gerada)>0))return false;
  const digitos=(v:unknown)=>String(v??"").replace(/\D/g,"");
  return unidades.every(u=>faturas.some(f=>chaveCompetencia(f.referencia)===competencia && digitos(f.numero_instalacao)===digitos(u.numero)
    && f.cliente_id===u.cliente_id && !["RASCUNHO","CANCELADO","CANCELADA","ERRO","PROCESSANDO"].includes(String(f.status).toUpperCase())));
}
