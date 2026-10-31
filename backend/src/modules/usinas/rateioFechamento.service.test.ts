import assert from 'node:assert/strict';
import test from 'node:test';
process.env.SUPABASE_URL='https://rateio-fechamento-test.invalid';
process.env.SUPABASE_SERVICE_KEY='test-key';

test('serviço aguarda todas as UCs ativas, sem usar anexo cadastral nem excluir UC por contrato',async()=>{
 const {fechamentoRateioAtualCompleto}=await import('./rateioAutomatico.service.js');
 const original=globalThis.fetch;
 const faturas:any[]=[{numero_instalacao:'111111',cliente_id:'c1',referencia:'OUT/2026',status:'ABERTA'}];
 const consultas:string[]=[];
 globalThis.fetch=async input=>{
  const url=new URL(String(input));
  assert.equal(url.origin,'https://rateio-fechamento-test.invalid');
  const tabela=url.pathname.split('/').pop()!;consultas.push(tabela);
  let rows:any[];
  if(tabela==='fechamentos')rows=[{competencia:'2026-10-01',energia_gerada:1000,energia_gerada_fatura:1000,fatura_usina_validada_em:"2026-10-01T00:00:00Z"}];
  else if(tabela==='faturas')rows=faturas;
  else if(tabela==='unidades_consumidoras'){
   assert.equal(url.searchParams.get('status'),'eq.ATIVA');
   rows=[{id:'uc1',numero:'111111',cliente_id:'c1'},{id:'uc2',numero:'222222',cliente_id:'c2'}];
  }else if(tabela==='recebimentos_faturas_email'){
   assert.equal(url.searchParams.get('status'),'eq.PROCESSADO');
   assert.equal(url.searchParams.get('payload->andrade_processamento->>tipo'),'eq.FATURAMENTO_SUSPENSO');
   rows=[];
  }else throw new Error(`Consulta indevida: ${tabela}`);
  return new Response(JSON.stringify(rows),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  assert.equal(await fechamentoRateioAtualCompleto('u','e','2026-10'),false);
  faturas.push({numero_instalacao:'222222',cliente_id:'c2',referencia:'OUT/2026',status:'ABERTA'});
  assert.equal(await fechamentoRateioAtualCompleto('u','e','2026-10'),true);
  assert.ok(!consultas.includes('faturas_anexadas_clientes'));
  assert.ok(!consultas.includes('contratos'));
 }finally{globalThis.fetch=original;}
});
