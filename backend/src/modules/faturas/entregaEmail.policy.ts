export function estadoEntrega(provedor:string,payload:any,messageId:string):'ENTREGUE'|'FALHOU'|null{
 if(provedor==='RESEND'){
  if(payload?.id!==messageId)return null;
  if(['delivered','opened','clicked'].includes(payload.last_event))return 'ENTREGUE';
  if(['bounced','failed','suppressed'].includes(payload.last_event))return 'FALHOU';
 }
 if(provedor==='BREVO'){
  const eventos=(Array.isArray(payload?.events)?payload.events:[]).filter((event:any)=>event.messageId===messageId);
  if(eventos.some((event:any)=>['delivered','opened','clicks','unique_opened'].includes(event.event)))return 'ENTREGUE';
  if(eventos.some((event:any)=>['hardBounces','blocked','invalid','error','hard_bounce'].includes(event.event)))return 'FALHOU';
 }
 return null;
}
