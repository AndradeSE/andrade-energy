import {supabase} from '../../config/supabase';
import {criarNotificacaoApp} from '../notificacoes/push.service';
type Evento='ERRO_IMPORTACAO'|'ERRO_ENVIO'|'ENVIO_PENDENTE'|'FATURA_ENVIADA'|'FATURA_ENTREGUE';
const titulos:Record<Evento,string>={ERRO_IMPORTACAO:'Falha no faturamento automático',ERRO_ENVIO:'Falha no envio da fatura',ENVIO_PENDENTE:'Envio da fatura pendente',FATURA_ENVIADA:'Fatura enviada ao provedor',FATURA_ENTREGUE:'Entrega da fatura confirmada'};
export async function avisarFaturamentoAutomatico(input:{empresaId:string;usinaId?:string;clienteId?:string;faturaId?:string;unidadeId?:string;evento:Evento;chave:string;detalhe:string}){
 let contexto='',titulo=titulos[input.evento],rota=input.faturaId?`/faturas/${input.faturaId}`:'/faturas',usinaId=input.usinaId;
 if(input.unidadeId){
  const unidade=await supabase.from('unidades_consumidoras').select('id,numero,tipo,usina_id,usinas(nome)').eq('id',input.unidadeId).eq('empresa_id',input.empresaId).maybeSingle();
  if(unidade.error)throw unidade.error;
  if(unidade.data){
   const u=unidade.data;const usina:any=Array.isArray(u.usinas)?u.usinas[0]:u.usinas;
   usinaId=u.usina_id??undefined;
   const producao=u.tipo==='GERADORA';
   contexto=`${producao?'Produção da usina':'Fatura de cliente'}${usina?.nome?` · ${usina.nome}`:''} · UC ${u.numero}. `;
   if(input.evento==='ERRO_IMPORTACAO')titulo=producao?'Produção da usina · falha na leitura':'Faturas de clientes · falha na leitura';
   rota=`/unidades/recebimento-email?unidadeId=${encodeURIComponent(u.id)}`;
  }
 }
 const {data,error}=await supabase.from('empresa_usuarios').select('usuario_id').eq('empresa_id',input.empresaId).eq('ativo',true).in('papel',['ADMIN_EMPRESA','GESTOR']);
 if(error)throw error;
 const ids=[...new Set((data??[]).map(row=>String(row.usuario_id)))];
 for(const usuario_id of ids)await criarNotificacaoApp({usuario_id,empresa_id:input.empresaId,usina_id:usinaId,cliente_id:input.clienteId,tipo:input.evento,titulo,detalhe:contexto+input.detalhe,rota,chave_dedupe:`automatico:${input.evento}:${input.chave}:${usuario_id}`});
}
