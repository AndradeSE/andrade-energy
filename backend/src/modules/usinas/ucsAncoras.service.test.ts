import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://ancoras-test.invalid';
process.env.SUPABASE_SERVICE_KEY='somente-teste';
const id='11111111-1111-4111-8111-111111111111';

test('valida números e apelidos sem exigir CPF ou dados extras',async()=>{
 const {validarCadastroAncora}=await import('./ucsAncoras.service.js');
 assert.deepEqual(validarCadastroAncora({numero:' 1121361801894 ',apelido:' Reserva GD1 '}),{numero:'1121361801894',apelido:'Reserva GD1'});
 assert.deepEqual(validarCadastroAncora({numero:'123456'}),{numero:'123456',apelido:''});
 for(const dados of [{numero:'12345'},{numero:'1'.repeat(21)},{numero:'123-456'},{numero:123456},{numero:'123456',apelido:'x'.repeat(81)},{numero:'123456',apelido:'nome\nlinha'}])assert.throws(()=>validarCadastroAncora(dados));
});

test('lista, edição e exclusão são isoladas por empresa e exclusão é reversível no banco',async()=>{
 const {cadastroAncoras}=await import('./ucsAncoras.service.js');
 const original=globalThis.fetch;const chamadas:any[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),metodo=init?.method??'GET';const body=init?.body?JSON.parse(String(init.body)):undefined;
  chamadas.push({tabela:url.pathname.split('/').pop(),url,metodo,body});
  assert.equal(url.searchParams.get('empresa_id'),metodo==='POST'?null:'eq.empresa-a');
  if(url.pathname.endsWith('/usinas')){assert.equal(url.searchParams.get('id'),'eq.usina-a');return Response.json({id:'usina-a'});}
  assert.ok(url.pathname.endsWith('/rateio_ucs_ancoras'));
  if(metodo==='POST'){assert.equal(body.empresa_id,'empresa-a');return Response.json({id,numero:body.numero,apelido:body.apelido});}
  assert.equal(url.searchParams.get('excluido_em'),'is.null');
  if(metodo==='PATCH'){assert.equal(url.searchParams.get('id'),`eq.${id}`);return Response.json({id,numero:body.numero??'123456',apelido:body.apelido??''});}
  return Response.json([{id,numero:'123456',apelido:'Reserva'}]);
 };
 try{
  assert.equal((await cadastroAncoras.listar('usina-a','empresa-a'))[0].apelido,'Reserva');
  await cadastroAncoras.salvar('usina-a','empresa-a',{numero:'123456',apelido:'Reserva'});
  await cadastroAncoras.salvar('usina-a','empresa-a',{numero:'654321',apelido:'Nova reserva'},id);
  assert.deepEqual(await cadastroAncoras.excluir('usina-a','empresa-a',id),{excluido:true});
  const ultima=chamadas.at(-1);assert.equal(ultima.metodo,'PATCH');assert.ok(ultima.body.excluido_em);
  assert.ok(chamadas.every(c=>['usinas','rateio_ucs_ancoras'].includes(c.tabela)));
 }finally{globalThis.fetch=original;}
});

test('usina de outra empresa impede qualquer consulta ou mutação na lista',async()=>{
 const {cadastroAncoras}=await import('./ucsAncoras.service.js');const original=globalThis.fetch;let consultas=0;
 globalThis.fetch=async(input)=>{consultas++;assert.ok(String(input).includes('/usinas?'));return Response.json(null);};
 try{
  for(const acao of [()=>cadastroAncoras.listar('fora','empresa-a'),()=>cadastroAncoras.salvar('fora','empresa-a',{numero:'123456'}),()=>cadastroAncoras.excluir('fora','empresa-a',id)])await assert.rejects(acao,/Usina não encontrada/);
  assert.equal(consultas,3);
 }finally{globalThis.fetch=original;}
});

test('duplicidade tem mensagem segura sem expor resposta do banco',async()=>{
 const {cadastroAncoras}=await import('./ucsAncoras.service.js');const original=globalThis.fetch;
 globalThis.fetch=async(input)=>String(input).includes('/usinas?')?Response.json({id:'usina-a'}):Response.json({code:'23505',message:'detalhe privado'},{status:409});
 try{await assert.rejects(cadastroAncoras.salvar('usina-a','empresa-a',{numero:'123456'}),/Essa UC já está/);}finally{globalThis.fetch=original;}
});
