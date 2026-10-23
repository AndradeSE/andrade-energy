import {primaryApiOrigin,type ContingencyEnvironment} from './contingencyRuntime';

const paths=new Set(['/api/webhooks/asaas','/api/webhooks/asaas/saques','/api/webhooks/resend','/api/webhooks/mercado-pago']);
export function isProviderIngress(method:unknown,path:string) {
  return method==='POST' && paths.has(path.replace(/\/$/,''));
}
/** Forward the original signed bytes once; the primary validates provider identity. */
export async function forwardProviderIngress(event:any,environment:ContingencyEnvironment,request:typeof fetch=fetch) {
  if(!isProviderIngress(event.httpMethod,event.path))throw new Error('Rota de provedor inválida.');
  const allowed=new Set(['content-type','asaas-access-token','x-request-id','x-signature','svix-id','svix-signature','svix-timestamp']);
  const headers:Record<string,string>={};
  for(const [key,value] of Object.entries(event.headers??{}))if(allowed.has(key.toLowerCase())&&typeof value==='string')headers[key.toLowerCase()]=value;
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(event.queryStringParameters??{}))if(typeof value==='string')query.set(key,value);
  const suffix=query.size?`?${query.toString()}`:'';
  const bytes=Buffer.from(event.body??'',event.isBase64Encoded?'base64':'utf8');
  const response=await request(`${primaryApiOrigin(environment)}${event.path}${suffix}`,{
    method:'POST',headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(40_000),
  });
  return {statusCode:response.status,headers:{'Content-Type':response.headers.get('content-type')??'application/json','Cache-Control':'no-store'},body:await response.text()};
}
