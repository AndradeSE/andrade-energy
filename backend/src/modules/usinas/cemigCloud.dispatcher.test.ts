import test from 'node:test';
import assert from 'node:assert/strict';
import {cemigRenderHabilitado,criarDespachanteCemig} from './cemigCloud.dispatcher';
import {CEMIG_PREVIEW_DB} from './cemigCloud.policy';

const env={SUPABASE_URL:CEMIG_PREVIEW_DB,CEMIG_CLOUD_ENABLED:'true',CEMIG_CLOUD_EXECUTOR:'RENDER',
  BROWSERBASE_FREE_PLAN_CONFIRMED:'true',BROWSERBASE_API_KEY:'test-only',BROWSERBASE_PROJECT_ID:'project-test'};
test('dispatcher exige Preview, configuração completa e instância Render',()=>{
  assert.equal(cemigRenderHabilitado(env),true);
  for(const patch of [{SUPABASE_URL:'https://production.supabase.co'},{CEMIG_CLOUD_ENABLED:'false'},
    {CEMIG_CLOUD_EXECUTOR:'NETLIFY'},{API_RUNTIME:'serverless'},{BACKGROUND_JOBS_ENABLED:'false'},
    {BROWSERBASE_API_KEY:''},{BROWSERBASE_FREE_PLAN_CONFIRMED:'false'},{BROWSERBASE_PROJECT_ID:''}])
    assert.equal(cemigRenderHabilitado({...env,...patch}),false);
});
test('ticks simultâneos não repetem a busca nem a execução',async()=>{
  let liberar!:()=>void;let buscas=0;let execucoes=0;
  const concluido=new Promise<void>(resolve=>{liberar=resolve;});
  const tick=criarDespachanteCemig({buscar:async()=>{buscas++;return 'job';},
    executar:async()=>{execucoes++;await concluido;},falhou:()=>assert.fail()});
  const primeiro=tick();await Promise.resolve();await tick();
  assert.equal(buscas,1);assert.equal(execucoes,1);
  liberar();await primeiro;await tick();
  assert.equal(buscas,2);assert.equal(execucoes,2);
});
test('falha de execução libera o dispatcher e fila vazia não executa',async()=>{
  let erros=0;let chamadas=0;let buscas=0;
  const tick=criarDespachanteCemig({buscar:async()=>++buscas===1?'job':null,
    executar:async()=>{chamadas++;throw new Error('private');},falhou:()=>{erros++;}});
  await tick();await tick();assert.equal(erros,1);assert.equal(chamadas,1);assert.equal(buscas,2);
});
