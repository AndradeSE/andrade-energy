export function priorizarConexoesGmail<T extends {regra_status?:string;regra_erro?:unknown;conectado_em?:string}>(rows:T[]):T[] {
  const priority=(c:T)=>c.regra_status==='ATIVA'&&!c.regra_erro?1:0;
  return [...rows].sort((a,b)=>priority(b)-priority(a)||
    (Date.parse(b.conectado_em??'')||0)-(Date.parse(a.conectado_em??'')||0));
}

function scope(unit:any):string|null {
  const plant=Array.isArray(unit?.usinas)?unit.usinas[0]:unit?.usinas;
  if(unit?.tipo==='GERADORA')return `GERADORA:${unit.id}`;
  return plant?.titularidade_ucs_recebedoras==='CLIENTE'?(unit.cliente_id?`CLIENTE:${unit.cliente_id}`:null):'GERADOR';
}
export function mesmaCaixaGmailAutorizada(original:any,unit:any,candidate:any,candidateUnit:any):boolean {
  return !!original.usuario_id && !!original.empresa_id && !!original.email_conectado &&
    original.usuario_id===candidate.usuario_id && original.empresa_id===candidate.empresa_id &&
    String(original.email_conectado).trim().toLowerCase()===String(candidate.email_conectado??'').trim().toLowerCase() &&
    candidate.provedor==='GMAIL' && candidate.status==='LEITURA_AUTORIZADA' &&
    candidate.regra_status==='ATIVA' && !candidate.regra_erro && !!candidateUnit && !!scope(unit) && scope(unit)===scope(candidateUnit);
}
