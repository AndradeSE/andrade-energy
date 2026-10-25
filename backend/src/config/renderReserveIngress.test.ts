import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createServer} from 'node:http';
import {createRenderReserveIngress} from './renderReserveIngress';
const env={CONTINGENCY_EXECUTOR:'RENDER_RESERVA',CONTINGENCY_ENVIRONMENT:'preview',
  SUPABASE_URL:'https://qqhcjieymypowunkixmk.supabase.co',CONTINGENCY_ROUTING_ENABLED:'true',BACKGROUND_JOBS_ENABLED:'false'};

for (const environment of ['preview','production'] as const) test(`${environment} callback relay preserves signed bytes and bypasses no ordinary app route`,async()=>{
 const runtimeEnv=environment==='preview'?env:{...env,CONTINGENCY_ENVIRONMENT:'production',
   RENDER_RESERVE_PRODUCTION_ENABLED:'true',SUPABASE_URL:'https://ehnkyrsseisvvtbkwrvu.supabase.co'};
 let owner='RENDER',forwarded=0,local=0,reads=0,dbError=false;
 const bytes='{ "type": "email.received", "value": "á" }';
 const store={from:()=>({select(){return this;},eq(){return this;},single:async()=>{reads++;return {data:{executor:owner},error:dbError};}})};
 const request=(async(url:any,input:any)=>{
   forwarded++;const target=new URL(url);assert.equal(target.origin,owner==='NETLIFY'
     ? (environment==='preview'?'https://andrade-energy-fallback-probe.netlify.app':'https://andrade-energy-api-reserva.netlify.app')
     : (environment==='preview'?'https://andrade-energy-api-homologacao.onrender.com':'https://andrade-energy-api-vda.onrender.com'));
   if(target.pathname.includes('/oauth/')) return new Response(null,{status:302,headers:{location:'andradegerador://oauth?status=invalid'}});
   assert.deepEqual(input.body,Buffer.from(bytes));assert.equal(input.headers['svix-signature'],'fixture');
   return new Response('{"ok":true}',{status:202});
 }) as typeof fetch;
 const app=express();app.use(createRenderReserveIngress(store,runtimeEnv,request));app.use(express.json());
 app.use((req,res)=>{local++;res.json({body:req.body??null});});
 const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address() as any;const base=`http://127.0.0.1:${address.port}`;
 try {
   const post=()=>fetch(base+'/api/webhooks/resend/inbound',{method:'POST',headers:{'content-type':'application/json','svix-signature':'fixture'},body:bytes});
   assert.equal((await post()).status,202);assert.equal(forwarded,1);assert.equal(local,0);
   owner='RENDER_RESERVA';const active=await post();assert.equal(active.status,200);assert.deepEqual((await active.json() as any).body,JSON.parse(bytes));
   assert.equal(forwarded,1);assert.equal(local,1);
   owner='NETLIFY';assert.equal((await post()).status,202);assert.equal(forwarded,2);assert.equal(local,1);
   assert.equal((await fetch(base+'/api/webhooks/resend/inbound',{method:'POST',headers:{'x-contingency-relay':'1'},body:bytes})).status,503);
   assert.equal(forwarded,2);
   const before=reads;assert.equal((await fetch(base+'/api/clientes')).status,200);assert.equal(reads,before);
   owner='RENDER';dbError=true;assert.equal((await post()).status,503);assert.equal(forwarded,2);
   dbError=false;const oauth=await fetch(base+'/api/oauth/email/callback/gmail?state=invalid',{redirect:'manual'});
   assert.equal(oauth.status,302);assert.equal(oauth.headers.get('location'),'andradegerador://oauth?status=invalid');assert.equal(forwarded,3);
 } finally {await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
