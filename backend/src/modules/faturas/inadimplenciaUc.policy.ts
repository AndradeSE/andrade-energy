import {chaveCompetencia} from '../dashboard/competencia.policy';
const pagos=new Set(['PAGO','PAGA','QUITADA','QUITADO','RECEBIDO','RECEBIDA','RECEIVED','CONFIRMED','RECEIVED_IN_CASH']);
const abertos=new Set(['ABERTA','ABERTO','VENCIDA','VENCIDO','PENDENTE','PENDING','OVERDUE']);
export function faturasVencidasSemPagamento(uc:{id?:string;numero:string;cliente_id:string},faturas:any[],hoje:string){
 return situacaoFinanceiraUc(uc,faturas,hoje).vencidas;
}
export function situacaoFinanceiraUc(uc:{id?:string;numero:string;cliente_id:string},faturas:any[],hoje:string){
 const numero=(value:unknown)=>String(value??'').replace(/\D/g,'');
 const competencias=new Set<string>();
 const abertas=new Set<string>();
 for(const fatura of faturas){
  if(String(fatura.cliente_id)!==String(uc.cliente_id))continue;
  if(fatura.unidade_consumidora_id&&uc.id?String(fatura.unidade_consumidora_id)!==String(uc.id):numero(fatura.numero_instalacao)!==numero(uc.numero))continue;
  if(!abertos.has(String(fatura.status??'').toUpperCase())||fatura.pago_em)continue;
  const vencimento=String(fatura.vencimento??'').slice(0,10);
  if((fatura.cobrancas??[]).some((c:any)=>c.pago_em||pagos.has(String(c.status??'').toUpperCase())))continue;
  // Duplicate imports/reissues from one month must not suspend a customer twice.
  const referencia=chaveCompetencia(fatura.referencia);
  const key=referencia||String(fatura.id);abertas.add(key);
  if(/^\d{4}-\d{2}-\d{2}$/.test(vencimento)&&vencimento<hoje&&Number.isFinite(Date.parse(vencimento)))competencias.add(key);
 }
 return {abertas:abertas.size,vencidas:competencias.size};
}
export const suspenderUcPorInadimplencia=(quantidade:number)=>quantidade>=2;
export const bloqueioUcAtivo=(anterior:boolean,situacao:{abertas:number;vencidas:number})=>situacao.vencidas>=2||anterior&&situacao.abertas>0;
