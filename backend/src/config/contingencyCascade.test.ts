import assert from 'node:assert/strict';
import test from 'node:test';
import {CASCADE_RENDER_SERVICES,classifyCascadeService,observeCascadeForContingency} from './contingencyCascade';
const env={API_RUNTIME:'serverless',BACKGROUND_JOBS_ENABLED:'false',CONTINGENCY_ENVIRONMENT:'preview',
  NETLIFY_FULL_VALIDATION_ENABLED:'true',NETLIFY_DURABLE_JOBS_ENABLED:'true',CONTINGENCY_CASCADE_ENABLED:'true',
  SUPABASE_URL:'https://qqhcjieymypowunkixmk.supabase.co',RENDER_MONITOR_API_KEY:'primary-fixture',
  RENDER_RESERVE_MONITOR_API_KEY:'reserve-fixture',COMMIT_REF:'a'.repeat(40)};
const service={id:CASCADE_RENDER_SERVICES.preview.reserve,type:'web_service',serviceDetails:{
  url:'https://andrade-energy-api-reserva-preview.onrender.com',plan:'free'},suspended:'suspended',suspenders:['billing']};
test('cascade checks the exact reserve, account-independent key and billing-only suspension',()=>{
  assert.equal(classifyCascadeService(service,'preview','reserve'),'BILLING');
  assert.equal(classifyCascadeService(service,'preview','primary'),'INDETERMINADO');
  assert.equal(classifyCascadeService(service,'production','reserve'),'INDETERMINADO');
  for(const suspenders of [[],['user'],['billing','admin']])assert.notEqual(classifyCascadeService({...service,suspenders},'preview','reserve'),'BILLING');
});
test('Netlify observes both accounts; missing credentials and network failure never signal billing',async()=>{
  const states:any[]=[];const calls:string[]=[];
  const store={from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{ativa:true,cascata_ativa:true,render_service_id:CASCADE_RENDER_SERVICES.preview.primary}})}),
    rpc:async(name:string,args:any)=>{assert.equal(name,'observar_cascata_contingencia');states.push(args);return {data:'OBSERVADO'};}};
  const request=(async(url:any,options:any)=>{
    calls.push(url);assert.equal(options.redirect,'error');
    if(url.endsWith(service.id)){assert.equal(options.headers.Authorization,'Bearer reserve-fixture');return new Response(JSON.stringify(service));}
    assert.equal(options.headers.Authorization,'Bearer primary-fixture');throw new Error('timeout');
  }) as typeof fetch;
  await observeCascadeForContingency(env,store,request);
  assert.equal(calls.length,2);assert.equal(states[0].p_estado_principal,'INDETERMINADO');assert.equal(states[0].p_estado_reserva,'BILLING');
  await observeCascadeForContingency({...env,RENDER_RESERVE_MONITOR_API_KEY:''},store,request);
  assert.equal(states[1].p_estado_reserva,'INDETERMINADO');assert.equal(calls.length,3);
  await observeCascadeForContingency({...env,CONTINGENCY_CASCADE_ENABLED:'false'},store,request);assert.equal(states.length,2);
  await observeCascadeForContingency({...env,API_RUNTIME:undefined},store,request);assert.equal(states.length,2);
});
