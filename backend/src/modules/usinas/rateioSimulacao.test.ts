import assert from 'node:assert/strict';
import test from 'node:test';
process.env.SUPABASE_URL='https://simulation-test.invalid';
process.env.SUPABASE_SERVICE_KEY='test';
test('simulação calcula rascunho com consultas somente de leitura e mantém escopo da empresa',async()=>{
 const {prepararPlanilhaRateio}=await import('./rateioMensal.service.js');
 const original=globalThis.fetch;let reads=0;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(init?.method??'GET','GET');assert.equal(url.hostname,'simulation-test.invalid');assert.equal(url.searchParams.get('empresa_id'),'eq.empresa-a');reads++;
  const table=url.pathname.split('/').pop();
  const data=table==='usinas'?{id:'usina-a',numero_instalacao:'123456789',titularidade_ucs_recebedoras:'GERADOR'}:table==='fechamentos'?[{energia_gerada:10000}]:table==='unidades_consumidoras'&&url.searchParams.get('tipo')==='eq.GERADORA'?{cpf_titular:null}:[];
  return Response.json(data);
 };
 try{const result=await prepararPlanilhaRateio('usina-a','empresa-a','2026-10','');assert.equal(result.rascunho,true);assert.equal(result.formatoCemig,false);assert.ok(result.csv);assert.ok(reads>=5);}finally{globalThis.fetch=original;}
});
