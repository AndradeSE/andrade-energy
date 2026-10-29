import {createHash} from 'node:crypto';
import {supabase} from '../../config/supabase';

export function conferirDesafioNativo(body:any){
 const u=new URL(String(body?.websiteURL??''));
 if(u.protocol!=='https:'||u.username||u.password||u.port||!['atende.cemig.com.br','www.atende.cemig.com.br'].includes(u.hostname)||!/^\/Login\/?$/i.test(u.pathname)||u.search||u.hash)throw new Error('Desafio fora do login oficial.');
 if(!/^[a-zA-Z0-9_-]{20,200}$/.test(body.websiteKey)||typeof body.userAgent!=='string'||body.userAgent.length>1000||!['RecaptchaV2Task','RecaptchaV2EnterpriseTask'].includes(body.tipo)||(body.s!==undefined&&(typeof body.s!=='string'||body.s.length>4000)))throw new Error('Desafio inválido.');
 return {websiteURL:u.toString(),websiteKey:body.websiteKey,userAgent:body.userAgent,tipo:body.tipo,...(body.s?{s:body.s}:{})};
}
export async function capApi(method:'getBalance'|'createTask'|'getTaskResult',data:object={},fetcher=fetch){
 const key=process.env.CAPMONSTER_API_KEY;
 if(!key)throw new Error('CapMonster não configurado.');
 const r=await fetcher(`https://api.capmonster.cloud/${method}`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey:key,...data})});
 if(!r.ok)throw new Error('Falha no provedor de verificação.');
 const body=await r.json();
 if(method==='getTaskResult'&&body.errorCode==='CAPTCHA_NOT_READY')return {status:'processing'};
 if(body.errorId!==0){const code=/^[A-Z0-9_]{1,80}$/.test(body.errorCode)?body.errorCode:'RECUSADO';throw new Error('CAPMONSTER_'+code);}return body;
}
const defaults={db:supabase,provider:capApi,env:process.env};
async function scope(usina:string,empresa:string,deps=defaults){
 if(!deps.env.SUPABASE_URL)throw new Error('Serviço nativo indisponível neste ambiente.');
 const r=await deps.db.from('usinas').select('id').eq('id',usina).eq('empresa_id',empresa).maybeSingle();if(r.error||!r.data)throw new Error('Acesso indisponível.');
}
export async function iniciarCaptchaNativo(usina:string,empresa:string,usuario:string,body:any,deps=defaults){
 await scope(usina,empresa,deps);
 if(body?.autorizaCaptcha!==true||! /^[a-zA-Z0-9_-]{16,128}$/.test(String(body.nonce??'')))throw new Error('Autorize a verificação desta sessão.');
 const desafio=conferirDesafioNativo(body.desafio);
 if(!deps.env.CAPMONSTER_API_KEY){console.warn('CEMIG_NATIVE_CAPTCHA SEM_CONFIGURACAO');return {manual:true,motivo:'SEM_CONFIGURACAO'};}
 const fingerprint=createHash('sha256').update(JSON.stringify([empresa,usuario,usina,body.nonce])).digest('hex');
 const existente=await deps.db.from('cemig_native_captchas').select('id,estado').eq('chave',fingerprint).maybeSingle();
 if(existente.error)throw new Error('Controle da verificação indisponível.');
 if(existente.data)return {id:existente.data.id,estado:existente.data.estado};
 const balance=await deps.provider('getBalance');
 if(typeof balance.balance!=='number'||!Number.isFinite(balance.balance)||balance.balance<=0||(balance.balance>0.100001&&body.autorizaSaldoExistente!==true)){console.warn('CEMIG_NATIVE_CAPTCHA SALDO_TESTE_NAO_CONFIRMADO');return {manual:true,motivo:'SALDO_TESTE_NAO_CONFIRMADO'};}
 const row=await deps.db.from('cemig_native_captchas').insert({chave:fingerprint,empresa_id:empresa,usuario_id:usuario,usina_id:usina,estado:'CRIANDO',expira_em:new Date(Date.now()+180000).toISOString()}).select('id').single();
 if(row.error||!row.data)throw new Error('Verificação já iniciada ou indisponível; não repetir.');
 try{
  const created=await deps.provider('createTask',{task:{type:desafio.tipo,websiteURL:desafio.websiteURL,websiteKey:desafio.websiteKey,userAgent:desafio.userAgent,...(desafio.s?(desafio.tipo==='RecaptchaV2EnterpriseTask'?{enterprisePayload:{s:desafio.s}}:{recaptchaDataSValue:desafio.s}):{})}});
  if(!Number.isSafeInteger(created.taskId)||created.taskId<=0)throw new Error();
  const saved=await deps.db.from('cemig_native_captchas').update({task_id:created.taskId,estado:'PROCESSANDO'}).eq('id',row.data.id).eq('estado','CRIANDO');if(saved.error)throw new Error();
  return {id:row.data.id,estado:'PROCESSANDO'};
 }catch{await deps.db.from('cemig_native_captchas').update({estado:'INCERTO'}).eq('id',row.data.id);throw new Error('Resultado da criação incerto. A tarefa não será repetida automaticamente.');}
}
export async function consultarCaptchaNativo(usina:string,empresa:string,usuario:string,id:string,deps=defaults){
 await scope(usina,empresa,deps);
 const r=await deps.db.from('cemig_native_captchas').select('task_id,estado,expira_em').eq('id',id).eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).maybeSingle();
 if(r.error||!r.data||Date.parse(r.data.expira_em)<=Date.now())throw new Error('Verificação encerrada.');
 if(!r.data.task_id||!['PROCESSANDO','RESOLVIDO'].includes(r.data.estado))return {estado:r.data.estado};
 const result=await deps.provider('getTaskResult',{taskId:r.data.task_id});
 if(result.status==='processing')return {estado:'PROCESSANDO'};
 const token=result.solution?.gRecaptchaResponse;
 if(result.status!=='ready'||typeof token!=='string'||token.length<20||token.length>20000)throw new Error('Resposta de verificação inválida.');
 await deps.db.from('cemig_native_captchas').update({estado:'RESOLVIDO'}).eq('id',id);
 return {estado:'RESOLVIDO',token};
}
