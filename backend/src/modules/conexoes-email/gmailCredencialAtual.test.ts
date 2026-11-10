import assert from 'node:assert/strict';
import test from 'node:test';
process.env.SUPABASE_URL='https://gmail-tests.example.com';
process.env.SUPABASE_SERVICE_KEY='fixture-only';
process.env.OAUTH_TOKEN_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
process.env.GOOGLE_OAUTH_CLIENT_ID='fixture-client';
process.env.GOOGLE_OAUTH_CLIENT_SECRET='fixture-secret';
const {supabase}=require('../../config/supabase');
const {obterTokenLeituraGmail,criptografarSegredoOAuth}=require('./conexoesEmail.service');

test('renovar Gmail do titular atende o vínculo antigo da usina sem copiar tokens ou ampliar escopo do consumidor',async t=>{
 for(const perfil of ['ADMIN','LEITURA']) {
  const queries:any[]=[]; const refreshes:string[]=[];
  const original={id:'old',usuario_id:'owner',email_conectado:'owner@example.com',conectado_em:'2026-11-03',status:'LEITURA_AUTORIZADA',provedor:'GMAIL',escopos:['https://www.googleapis.com/auth/gmail.readonly'],refresh_token_criptografado:criptografarSegredoOAuth('old-fixture')};
  const current={...original,id:'new',conectado_em:'2026-11-10',refresh_token_criptografado:criptografarSegredoOAuth('new-fixture')};
  const db=t.mock.method(supabase,'from',(table:string)=>{
   const record={table,filters:[] as any[],many:false,write:false};queries.push(record);
   const q:any={select(){return q;},eq(k:string,v:any){record.filters.push([k,v]);return q;},in(){return q;},gte(){return q;},order(){record.many=true;return q;},limit(){return q;},maybeSingle(){return q;},update(){record.write=true;return q;},then(resolve:any,reject:any){return Promise.resolve({error:null,data:table==='usuarios'?{perfil,ativo:true}:table==='empresa_usuarios'?{papel:perfil==='ADMIN'?'ADMIN_EMPRESA':'CLIENTE'}:record.many?[current]:original}).then(resolve,reject);}};return q;
  });
  const network=t.mock.method(globalThis,'fetch',async(_url:any,init:any)=>{
   assert.ok(init.signal); refreshes.push(init.body.get('refresh_token'));return Response.json({access_token:'access-fixture'});
  });
  assert.equal(await obterTokenLeituraGmail('old','company'),'access-fixture');
  assert.deepEqual(refreshes,[perfil==='ADMIN'?'new-fixture':'old-fixture']);
  assert.ok(queries.every(q=>!q.write));
  const candidates=queries.find(q=>q.table==='conexoes_email'&&q.many);
  if(perfil==='ADMIN')for(const pair of [['empresa_id','company'],['usuario_id','owner'],['email_conectado','owner@example.com']])assert.ok(candidates.filters.some((x:any)=>x[0]===pair[0]&&x[1]===pair[1]));
  else assert.equal(candidates,undefined);
  db.mock.restore();network.mock.restore();
 }
});
