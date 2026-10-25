import {executorApiOrigin,type ContingencyEnvironment} from './contingencyRuntime';

const paths=new Set(['/api/webhooks/asaas','/api/webhooks/asaas/saques','/api/webhooks/resend/inbound','/api/webhooks/mercado-pago']);
export function isProviderIngress(method:unknown,path:string) {
  return method==='POST' && paths.has(path.replace(/\/$/,''));
}
export function isOAuthIngress(method: unknown, path: string) {
  return method === 'GET' && /^\/api\/oauth\/email\/callback(?:\/(?:gmail|outlook))?\/?$/.test(path);
}
/** The code is passed only to the fixed primary; never follow its redirect server-side. */
export async function forwardOAuthIngress(event: any, environment: ContingencyEnvironment, request: typeof fetch = fetch, executor = 'RENDER') {
  if (!isOAuthIngress(event.httpMethod, event.path)) throw new Error('Callback inválido.');
  if (Object.keys(event.headers ?? {}).some(key => key.toLowerCase() === 'x-contingency-relay')) throw new Error('Callback já encaminhado.');
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(event.queryStringParameters ?? {})) if (typeof value === 'string') query.set(key, value);
  const response = await request(`${executorApiOrigin(environment, executor)}${event.path}?${query}`, {
    method: 'GET', headers: {'x-contingency-relay':'1'}, redirect: 'manual', signal: AbortSignal.timeout(40_000),
  });
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'Content-Type': response.headers.get('content-type') ?? 'text/plain' };
  const location = response.headers.get('location');
  if (location) headers.Location = location;
  return { statusCode: response.status, headers, body: await response.text() };
}
/** Forward the original signed bytes once; the primary validates provider identity. */
export async function forwardProviderIngress(event:any,environment:ContingencyEnvironment,request:typeof fetch=fetch,executor='RENDER') {
  if(!isProviderIngress(event.httpMethod,event.path))throw new Error('Rota de provedor inválida.');
  if(Object.keys(event.headers??{}).some(key=>key.toLowerCase()==='x-contingency-relay'))throw new Error('Callback já encaminhado.');
  const allowed=new Set(['content-type','asaas-access-token','x-request-id','x-signature','svix-id','svix-signature','svix-timestamp']);
  const headers:Record<string,string>={'x-contingency-relay':'1'};
  for(const [key,value] of Object.entries(event.headers??{}))if(allowed.has(key.toLowerCase())&&typeof value==='string')headers[key.toLowerCase()]=value;
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(event.queryStringParameters??{}))if(typeof value==='string')query.set(key,value);
  const suffix=query.size?`?${query.toString()}`:'';
  const bytes=Buffer.from(event.body??'',event.isBase64Encoded?'base64':'utf8');
  const response=await request(`${executorApiOrigin(environment,executor)}${event.path}${suffix}`,{
    method:'POST',headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(40_000),
  });
  return {statusCode:response.status,headers:{'Content-Type':response.headers.get('content-type')??'application/json','Cache-Control':'no-store'},body:await response.text()};
}
