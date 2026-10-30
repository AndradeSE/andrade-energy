import test from 'node:test';import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://rateio-uc-test.invalid';process.env.SUPABASE_SERVICE_KEY='test';
test('controle por UC é isolado por empresa, preserva suspensão financeira e exige contrato vigente',async()=>{
 const {obterRateioUc,salvarRateioUc}=await import('./rateioUc.service.js');
 const original=globalThis.fetch;let ativo=true,suspenso=true,contrato=true,escritas=0;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));const tabela=url.pathname.split('/').pop();
  assert.equal(url.searchParams.get('empresa_id'),'eq.empresa-a');
  if(tabela==='unidades_consumidoras'){
   assert.equal(url.searchParams.get('id'),'eq.uc-a');
   if(init?.method==='PATCH'){const body=JSON.parse(String(init.body));assert.deepEqual(Object.keys(body),['rateio_ativo']);ativo=body.rateio_ativo;escritas++;return Response.json({id:'uc-a'});}
   return Response.json({id:'uc-a',numero:'123456789',rateio_ativo:ativo});
  }
  assert.equal(init?.method??'GET','GET');
  if(tabela==='uc_bloqueios_inadimplencia')return Response.json({suspenso});
  if(tabela==='contratos')return Response.json(contrato?[{status:'VIGENTE'}]:[]);
  throw new Error('Operação inesperada');
 };
 try{
  assert.equal((await obterRateioUc('empresa-a','uc-a')).suspensoInadimplencia,true);
  assert.equal((await salvarRateioUc('empresa-a','uc-a',false)).ativo,false);
  suspenso=false;assert.equal((await obterRateioUc('empresa-a','uc-a')).ativo,false);
  contrato=false;await assert.rejects(()=>salvarRateioUc('empresa-a','uc-a',true),/contrato vigente/);assert.equal(escritas,1);
  contrato=true;assert.equal((await salvarRateioUc('empresa-a','uc-a',true)).ativo,true);
  await assert.rejects(()=>salvarRateioUc('empresa-a','uc-a','true'),/Informe/);assert.equal(escritas,2);
 }finally{globalThis.fetch=original;}
});
