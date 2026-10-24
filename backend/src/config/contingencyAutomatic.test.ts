import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyRenderService, observeRenderForContingency,lastRenderReserveObservation } from './contingencyAutomatic';
const env = { API_RUNTIME: 'serverless', BACKGROUND_JOBS_ENABLED: 'false', CONTINGENCY_ENVIRONMENT: 'preview', NETLIFY_FULL_VALIDATION_ENABLED: 'true', NETLIFY_DURABLE_JOBS_ENABLED: 'true', SUPABASE_URL: 'https://qqhcjieymypowunkixmk.supabase.co', RENDER_MONITOR_API_KEY: 'fixture', COMMIT_REF: 'validated-fixture' };
const service = { id: 'srv-das0mmfpn0mc73ec00hg', type: 'web_service', serviceDetails: { url: 'https://andrade-energy-api-homologacao.onrender.com', plan: 'free' }, suspended: 'suspended', suspenders: ['billing'] };
test('automatic contingency requires the exact free service and billing-only suspension', () => {
  assert.equal(classifyRenderService(service, 'preview'), 'BILLING');
  assert.equal(classifyRenderService(service, 'production'), 'INDETERMINADO');
  for (const suspenders of [['user'], ['admin'], ['billing', 'user'], [], ['unknown']]) assert.notEqual(classifyRenderService({ ...service, suspenders }, 'preview'), 'BILLING');
  for (const change of [{ id: 'other' }, { serviceDetails: { ...service.serviceDetails, plan: 'starter' } }, { serviceDetails: { ...service.serviceDetails, url: 'https://attacker.invalid' } }, { type: 'cron_job' }, { suspended: 'not_suspended' }]) assert.notEqual(classifyRenderService({ ...service, ...change }, 'preview'), 'BILLING');
  assert.equal(classifyRenderService({ ...service, suspended: 'not_suspended', suspenders: [] }, 'preview'), 'ATIVO');
});
test('an unavailable provider, invalid key or missing response is never a suspension signal', async () => {
  const states: string[] = [];
  const store = { from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: { ativa: true, render_service_id: service.id }, error: null }) }), rpc: async (_name: string, args: any) => { states.push(args.p_estado); return { data: 'OBSERVADO', error: null }; } };
  for (const response of [new Response('{}', { status: 401 }), new Response('{}', { status: 503 }), new Response('not-json', { status: 200 })]) await observeRenderForContingency(env, store, (async () => response) as typeof fetch);
  await observeRenderForContingency(env, store, (async () => { throw new Error('timeout'); }) as typeof fetch);
  await observeRenderForContingency({ ...env, RENDER_MONITOR_API_KEY: '' }, store, (async () => { assert.fail('no request without a key'); }) as typeof fetch);
  assert.deepEqual(states, Array(5).fill('INDETERMINADO'));
  await observeRenderForContingency(env, store, (async (url, options) => {
    assert.equal(url, `https://api.render.com/v1/services/${service.id}`); assert.equal(options?.redirect, 'error'); assert.equal(options?.method ?? 'GET', 'GET');
    return new Response(JSON.stringify(service), { status: 200 });
  }) as typeof fetch);
  assert.equal(states.at(-1), 'BILLING');
});

test('Render reserve observes the original Preview service through its own private RPC', async () => {
  const reserve={...env,API_RUNTIME:undefined,CONTINGENCY_EXECUTOR:'RENDER_RESERVA',
    CONTINGENCY_ROUTING_ENABLED:'true',RENDER_GIT_COMMIT:'a'.repeat(40)};
  let calls=0;
  const store={from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{ativa:true,render_service_id:service.id},error:null})}),
    rpc:async(name:string,args:any)=>{calls++;assert.equal(name,'observar_render_reserva_contingencia');assert.equal(args.p_commit,reserve.RENDER_GIT_COMMIT);assert.equal(args.p_estado,'BILLING');return {data:'CONFIRMANDO_BILLING',error:null};}};
  await observeRenderForContingency(reserve,store,(async()=>new Response(JSON.stringify(service))) as typeof fetch);
  assert.equal(calls,1);
});

test('a disabled switch can still diagnose the reserve key without activating anything',async()=>{
  const reserve={...env,API_RUNTIME:undefined,CONTINGENCY_EXECUTOR:'RENDER_RESERVA',CONTINGENCY_ROUTING_ENABLED:'true'};
  const store={from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{ativa:false,render_service_id:null},error:null})}),
    rpc:async(name:string)=>{assert.equal(name,'observar_render_reserva_contingencia');return {data:'DESATIVADA',error:null};}};
  assert.equal(await observeRenderForContingency(reserve,store,(async()=>new Response(JSON.stringify({...service,suspended:'not_suspended',suspenders:[]}))) as typeof fetch),'DESATIVADA');
  assert.equal(lastRenderReserveObservation()?.state,'ATIVO');
});
