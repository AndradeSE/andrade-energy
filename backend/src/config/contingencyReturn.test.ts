import assert from 'node:assert/strict';
import test from 'node:test';
import {observePrimaryReturn,primaryEnvironment,primaryReadyForReturn} from './contingencyReturn';
const commit='a'.repeat(40);
const env={SUPABASE_URL:'https://qqhcjieymypowunkixmk.supabase.co',CONTINGENCY_ROUTING_ENABLED:'true',DURABLE_SCHEDULER_ENABLED:'true',BACKGROUND_JOBS_ENABLED:'true',RENDER_GIT_COMMIT:commit};
const control={render_reserva_commit_validado:commit,render_reserva_validado_em:'2026-11-01T00:00:00Z'};
test('return requires the approved full release, correct database and durable execution fences',()=>{
  assert.equal(primaryReadyForReturn(env,control),true);
  for(const change of [{CONTINGENCY_ROUTING_ENABLED:'false'},{DURABLE_SCHEDULER_ENABLED:'false'},
    {BACKGROUND_JOBS_ENABLED:'false'},{CONTINGENCY_EXECUTOR:'RENDER_RESERVA'},
    {API_RUNTIME:'serverless'},{SUPABASE_URL:'https://other.supabase.co'},{RENDER_GIT_COMMIT:'a'.repeat(7)}])
    assert.equal(primaryReadyForReturn({...env,...change},control),false);
  assert.equal(primaryReadyForReturn(env,{...control,render_reserva_commit_validado:'b'.repeat(40)}),false);
  assert.equal(primaryReadyForReturn(env,{...control,render_reserva_validado_em:null}),false);
  assert.equal(primaryEnvironment({...env,SUPABASE_URL:'https://ehnkyrsseisvvtbkwrvu.supabase.co'}),'production');
});
test('self-monitor validates exact primary health and resets unhealthy observations without replaying work',async()=>{
  const observations:any[]=[];
  const store={from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{ativa:true,retorno_automatico:true}})}),
    rpc:async(name:string,args:any)=>{assert.equal(name,'observar_retorno_render');observations.push(args);return {data:'OBSERVADO'};}};
  const healthy={status:'online',environment:'preview',releaseCommit:commit,contingency:{executor:'RENDER',readyForReturn:true}};
  for(const body of [healthy,{...healthy,releaseCommit:'b'.repeat(40)},{...healthy,environment:'production'},
    {...healthy,contingency:{executor:'RENDER_RESERVA',readyForReturn:true}},
    {...healthy,contingency:{executor:'RENDER',readyForReturn:false}}]) {
    await observePrimaryReturn(env,store,(async(url,options)=>{
      assert.equal(url,'https://andrade-energy-api-homologacao.onrender.com/health');
      assert.equal(options?.redirect,'error');return new Response(JSON.stringify(body));
    }) as typeof fetch);
  }
  await observePrimaryReturn(env,store,(async()=>{throw new Error('timeout');}) as typeof fetch);
  assert.deepEqual(observations.map(o=>o.p_saudavel),[true,false,false,false,false,false]);
  assert.ok(observations.every(o=>o.p_commit===commit && o.p_servico==='srv-das0mmfpn0mc73ec00hg'));
});
test('disabled return and reserve instances never start self-return monitoring',async()=>{
  let calls=0;
  const store={from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{ativa:true,retorno_automatico:false}})}),rpc:async()=>assert.fail('disabled')};
  await observePrimaryReturn(env,store,(async()=>{calls++;throw new Error();}) as typeof fetch);
  await observePrimaryReturn({...env,CONTINGENCY_EXECUTOR:'RENDER_RESERVA'},store);
  assert.equal(calls,0);
});
