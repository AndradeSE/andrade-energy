import test from 'node:test';
import assert from 'node:assert/strict';
import {abrirNavegadorCemig} from './cemigCloud.browser';
import {CotaBrowserbaseInsuficiente,CEMIG_PREVIEW_DB,conferirMinutosGratuitos} from './cemigCloud.policy';
import {criarSteelPreview,steelPreviewHabilitado,conferirLiveSteel} from './cemigCloud.steel';

test('fallback somente por cota confirmada, consentimento e reserva habilitada',async()=>{
 for(const error of [new Error('timeout'),new CotaBrowserbaseInsuficiente()]){
  for(const consent of [false,true])for(const enabled of [false,true]){
   let creates=0;
   const deps={criarPrincipal:async()=>{throw error;},liberarPrincipal:async()=>{},livePrincipal:async()=>'',
    criarReserva:async()=>{creates++;return {id:'test',connectUrl:'wss://connect.steel.dev',liveUrl:'https://app.steel.dev/test',liberar:async()=>{}};},reservaHabilitada:()=>enabled};
   if(error instanceof CotaBrowserbaseInsuficiente&&consent&&enabled){
    const session=await abrirNavegadorCemig(consent,deps);assert.equal(session.provedor,'STEEL');assert.equal(creates,1);
   }else{await assert.rejects(abrirNavegadorCemig(consent,deps));assert.equal(creates,0);}
  }
 }
 for(const value of [null,undefined,NaN,-1]){
  assert.throws(()=>conferirMinutosGratuitos(value),error=>!(error instanceof CotaBrowserbaseInsuficiente));
 }
});

test('principal disponível não abre reserva; falha posterior nunca recria sessão',async()=>{
 let reservas=0,releases=0;
 const s=await abrirNavegadorCemig(true,{criarPrincipal:async()=>({id:'principal',connectUrl:'wss://browserbase.com'}),
  liberarPrincipal:async()=>{releases++;},livePrincipal:async()=>{throw new Error('live indisponível');},
  criarReserva:async()=>{reservas++;throw new Error();},reservaHabilitada:()=>true});
 assert.equal(s.provedor,'BROWSERBASE');await assert.rejects(s.live('https://atende.cemig.com.br/Login'));
 await s.liberar();assert.equal(reservas,0);assert.equal(releases,1);
});

const env={SUPABASE_URL:CEMIG_PREVIEW_DB,CEMIG_CLOUD_ENABLED:'true',CEMIG_STEEL_FALLBACK_ENABLED:'true',
 STEEL_TRIAL_ONLY_CONFIRMED:'true',STEEL_API_KEY:'test-not-a-real-key'};

test('diagnóstico Steel explícito não cria Browserbase e não repete sessão se falhar',async()=>{
 let principal=0,reserva=0;
 const deps={criarPrincipal:async()=>{principal++;throw new Error();},liberarPrincipal:async()=>{},livePrincipal:async()=>'',
  criarReserva:async()=>{reserva++;throw new Error('falha');},reservaHabilitada:()=>true};
 await assert.rejects(abrirNavegadorCemig(false,deps,'STEEL'));assert.equal(reserva,0);
 await assert.rejects(abrirNavegadorCemig(true,{...deps,reservaHabilitada:()=>false},'STEEL'));assert.equal(reserva,0);
 await assert.rejects(abrirNavegadorCemig(true,deps,'STEEL'));assert.equal(reserva,1);assert.equal(principal,0);
});
test('Steel exige Preview e confirmação de crédito sem cartão; URL não expõe chave',()=>{
 assert.equal(steelPreviewHabilitado(env),true);
 for(const patch of [{SUPABASE_URL:'https://production.supabase.co'},{STEEL_TRIAL_ONLY_CONFIRMED:'false'},
  {STEEL_API_KEY:''},{CEMIG_STEEL_FALLBACK_ENABLED:'false'}])assert.equal(steelPreviewHabilitado({...env,...patch}),false);
 for(const url of ['https://steel.dev.evil.test','http://app.steel.dev','https://u:p@app.steel.dev','https://app.steel.dev/?apiKey=secret'])
  assert.throws(()=>conferirLiveSteel(url));
});

test('Steel cria uma sessão limitada sem proxy, solver ou perfil e libera no encerramento',async()=>{
 const calls:{url:string;body:any}[]=[];
 const fetcher=(async(url,init)=>{
  const body=init?.body?JSON.parse(String(init.body)):null;calls.push({url:String(url),body});
  assert.equal(init?.redirect,'error');
  return new Response(JSON.stringify(body?{id:body.sessionId,status:'live',debugUrl:'https://app.steel.dev/debug/session'}:{}),{status:200});
 }) as typeof fetch;
 const s=await criarSteelPreview({env,fetcher});
 assert.equal(calls[0].url,'https://api.steel.dev/v1/sessions');
 assert.equal(calls[0].body.timeout,510000);assert.equal(calls[0].body.solveCaptcha,false);
 assert.equal(calls[0].body.useProxy,false);assert.equal(calls[0].body.persistProfile,false);
 assert.equal(new URL(s.connectUrl).hostname,'connect.steel.dev');
 assert.equal(new URL(s.connectUrl).searchParams.get('sessionId'),s.id);
 await s.liberar();assert.equal(calls.length,2);assert.match(calls[1].url,/\/release$/);
});

test('criação incerta tenta liberação do mesmo ID, sem nova tarefa nem vazamento',async()=>{
 const urls:string[]=[];
 const fetcher=(async(url)=>{urls.push(String(url));throw new Error('secret from upstream');}) as typeof fetch;
 await assert.rejects(criarSteelPreview({env,fetcher}),error=>error instanceof Error&&!error.message.includes('secret'));
 assert.equal(urls.length,2);assert.equal(urls.filter(u=>u==='https://api.steel.dev/v1/sessions').length,1);
 assert.match(urls[1],/^https:\/\/api\.steel\.dev\/v1\/sessions\/[\da-f-]+\/release$/);
});


