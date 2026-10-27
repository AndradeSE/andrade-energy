import {supabase} from '../../config/supabase';
import {estadoEntrega} from './entregaEmail.policy';
import {avisarFaturamentoAutomatico} from './avisosAutomaticos.service';

// Consultas não reenviam a mensagem. ENVIADA nunca implica entrega ao cliente.
export async function conferirEntregasEmail(){
 const agora=new Date().toISOString();
 const {data,error}=await supabase.from('notificacoes_fatura').select('*,faturas(*)')
  .eq('canal','EMAIL').eq('status','ENVIADA').eq('entrega_status','NAO_CONFIRMADA')
  .not('provedor_mensagem_id','is',null).in('provedor_envio',['BREVO','RESEND'])
  .gte('enviada_em',new Date(Date.now()-7*86400000).toISOString())
  .or(`entrega_consultada_em.is.null,entrega_consultada_em.lt.${new Date(Date.now()-300000).toISOString()}`)
  .order('entrega_consultada_em',{ascending:true,nullsFirst:true}).limit(10);
 if(error)throw error;
 for(const item of data??[]){
  const chave=item.provedor_envio==='BREVO'?process.env.BREVO_API_KEY:process.env.RESEND_USAGE_API_KEY??process.env.RESEND_API_KEY;
  if(!chave||!item.faturas?.empresa_id)continue;
  await supabase.from('notificacoes_fatura').update({entrega_consultada_em:agora}).eq('id',item.id);
  try{
   const brevo=item.provedor_envio==='BREVO';
   const url=brevo?`https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(item.provedor_mensagem_id)}`:`https://api.resend.com/emails/${encodeURIComponent(item.provedor_mensagem_id)}`;
   const resposta=await fetch(url,{headers:brevo?{'api-key':chave}:{Authorization:`Bearer ${chave}`},signal:AbortSignal.timeout(15000)});
   if(!resposta.ok)continue;
   const estado=estadoEntrega(item.provedor_envio,await resposta.json(),item.provedor_mensagem_id);
   if(!estado)continue;
   await avisarFaturamentoAutomatico({empresaId:item.faturas.empresa_id,usinaId:item.faturas.usina_id,clienteId:item.cliente_id,faturaId:item.fatura_id,evento:estado==='ENTREGUE'?'FATURA_ENTREGUE':'ERRO_ENVIO',chave:`entrega:${item.id}`,detalhe:estado==='ENTREGUE'?`O provedor confirmou a entrega do e-mail da fatura ${item.faturas.referencia??''} ao endereço do cliente. Isso não comprova leitura pela pessoa.`:`O provedor informou falha na entrega do e-mail da fatura ${item.faturas.referencia??''}. Confira o endereço do cliente antes de reenviar.`});
   const salvo=await supabase.from('notificacoes_fatura').update({entrega_status:estado,entregue_em:estado==='ENTREGUE'?agora:null}).eq('id',item.id).eq('entrega_status','NAO_CONFIRMADA');
   if(salvo.error)throw salvo.error;
  }catch{console.error('Não foi possível confirmar a entrega de uma fatura.');}
 }
}
