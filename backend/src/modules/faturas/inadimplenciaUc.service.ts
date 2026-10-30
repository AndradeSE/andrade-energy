import {supabase} from '../../config/supabase';
import {situacaoFinanceiraUc,bloqueioUcAtivo} from './inadimplenciaUc.policy';
import {criarNotificacaoApp} from '../notificacoes/push.service';
export class FaturamentoUcSuspenso extends Error{
 readonly code='UC_SUSPENSA_INADIMPLENCIA';
 constructor(readonly quantidade:number){super(`Faturamento suspenso por inadimplência: quite todas as faturas em aberto da UC para retomar automaticamente. Novas cobranças e novas alocações ficam bloqueadas; a sobra do rateio vai para a âncora.`);}
}
export function hojeFinanceiro(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export async function atualizarInadimplenciaAutomaticamente(){
 for(let offset=0;offset<100000;offset+=1000){
  const unidades=await supabase.from('unidades_consumidoras').select('id,numero,cliente_id,empresa_id').eq('status','ATIVA').neq('tipo','GERADORA').order('id').range(offset,offset+999);
  if(unidades.error)throw unidades.error;
  for(const uc of unidades.data??[]){
   if(!uc.cliente_id||!uc.empresa_id)continue;
   try{await conferirFaturamentoDaUc(uc.empresa_id,uc);}catch(error){if(!(error instanceof FaturamentoUcSuspenso))throw error;}
  }
  if((unidades.data?.length??0)<1000)return;
 }
 throw new Error('A conferência de inadimplência atingiu o limite de unidades.');
}
export async function conferirFaturamentoDaUc(empresaId:string,uc:{id:string;numero:string;cliente_id:string}){
 const faturas:any[]=[];
 for(let offset=0;offset<100000;offset+=1000){
  const result=await supabase.from('faturas').select('id,cliente_id,unidade_consumidora_id,numero_instalacao,referencia,status,vencimento,cobrancas(status,pago_em)')
   .eq('empresa_id',empresaId).eq('cliente_id',uc.cliente_id).order('id').range(offset,offset+999);
  if(result.error)throw result.error;
  faturas.push(...result.data??[]);
  if((result.data??[]).length<1000){
   const bloqueio=await atualizarBloqueioUc(empresaId,uc,faturas);
   if(bloqueio.suspenso)throw new FaturamentoUcSuspenso(bloqueio.abertas);
   return;
  }
 }
 throw new Error('Não foi possível conferir todo o histórico de pagamento da UC.');
}
export async function atualizarBloqueioUc(empresaId:string,uc:{id:string;numero:string;cliente_id:string},faturas:any[]){
 const situacao=situacaoFinanceiraUc(uc,faturas,hojeFinanceiro());
 const previous=await supabase.from('uc_bloqueios_inadimplencia').select('suspenso,bloqueado_em').eq('empresa_id',empresaId).eq('unidade_consumidora_id',uc.id).maybeSingle();
 if(previous.error)throw previous.error;
 const suspenso=bloqueioUcAtivo(previous.data?.suspenso===true,situacao);
 if(suspenso!==Boolean(previous.data?.suspenso)){
  const agora=new Date().toISOString();
  const valores={empresa_id:empresaId,unidade_consumidora_id:uc.id,suspenso,bloqueado_em:suspenso?agora:previous.data?.bloqueado_em,regularizado_em:suspenso?null:agora,atualizado_em:agora};
  const saved=previous.data
   ? await supabase.from('uc_bloqueios_inadimplencia').update(valores).eq('empresa_id',empresaId).eq('unidade_consumidora_id',uc.id).eq('suspenso',previous.data.suspenso).select('suspenso')
   : await supabase.from('uc_bloqueios_inadimplencia').upsert(valores,{onConflict:'empresa_id,unidade_consumidora_id',ignoreDuplicates:true}).select('suspenso');
  if(saved.error)throw saved.error;
  if(!saved.data?.length)return {suspenso:true,...situacao}; // concorrência: não libera nem repete aviso.
  const gestores=await supabase.from('empresa_usuarios').select('usuario_id').eq('empresa_id',empresaId).eq('ativo',true).in('papel',['GESTOR','ADMIN_EMPRESA']);
  if(!gestores.error)for(const gestor of gestores.data??[])await criarNotificacaoApp({usuario_id:gestor.usuario_id,empresa_id:empresaId,tipo:suspenso?'UC_SUSPENSA_INADIMPLENCIA':'UC_REGULARIZADA',titulo:suspenso?'UC suspensa por inadimplência':'UC regularizada',detalhe:`UC ${uc.numero}: ${suspenso?'novas cobranças e novas alocações suspensas até quitar todas as faturas em aberto. A sobra vai para a âncora. O contrato e as dívidas anteriores permanecem.':'todas as faturas em aberto foram quitadas. Faturamento e rateio voltam automaticamente.'}`,rota:'/clientes',chave_dedupe:`inadimplencia:${empresaId}:${uc.id}:${suspenso?'suspensa':'regularizada'}:${suspenso?agora:previous.data?.bloqueado_em}`}).catch(()=>console.error('Aviso de inadimplência pendente.'));
 }
 return {suspenso,...situacao};
}
