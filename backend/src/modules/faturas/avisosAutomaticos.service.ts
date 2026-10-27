import {supabase} from '../../config/supabase';
import {criarNotificacaoApp} from '../notificacoes/push.service';
type Evento='ERRO_IMPORTACAO'|'ERRO_ENVIO'|'ENVIO_PENDENTE'|'FATURA_ENVIADA'|'FATURA_ENTREGUE';
const titulos:Record<Evento,string>={ERRO_IMPORTACAO:'Falha no faturamento automático',ERRO_ENVIO:'Falha no envio da fatura',ENVIO_PENDENTE:'Envio da fatura pendente',FATURA_ENVIADA:'Fatura enviada ao provedor',FATURA_ENTREGUE:'Entrega da fatura confirmada'};
export async function avisarFaturamentoAutomatico(input:{empresaId:string;usinaId?:string;clienteId?:string;faturaId?:string;evento:Evento;chave:string;detalhe:string}){
 const {data,error}=await supabase.from('empresa_usuarios').select('usuario_id').eq('empresa_id',input.empresaId).eq('ativo',true).in('papel',['ADMIN_EMPRESA','GESTOR']);
 if(error)throw error;
 const ids=[...new Set((data??[]).map(row=>String(row.usuario_id)))];
 for(const usuario_id of ids)await criarNotificacaoApp({usuario_id,empresa_id:input.empresaId,usina_id:input.usinaId,cliente_id:input.clienteId,tipo:input.evento,titulo:titulos[input.evento],detalhe:input.detalhe,rota:input.faturaId?`/faturas/${input.faturaId}`:'/faturas',chave_dedupe:`automatico:${input.evento}:${input.chave}:${usuario_id}`});
}
