import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://production-test.invalid';
process.env.SUPABASE_SERVICE_KEY='test';
test('aviso separado por destinatário, com mês correto e chave estável',async()=>{
 const {avisosProducao}=await import('./producaoNotificacao.js');
 const avisos=avisosProducao(['u1','u2','u1'],'usina1','empresa1','Usina','2026-10-01',10000);
 assert.equal(avisos.length,2);assert.notEqual(avisos[0].chave_dedupe,avisos[1].chave_dedupe);
 assert.deepEqual(avisos,avisosProducao(['u1','u2'],'usina1','empresa1','Usina','2026-10-01',10000));
 assert.equal(avisos[0].rota,'/operacao/rateio?competencia=2026-10&usinaId=usina1');assert.match(avisos[0].detalhe,/10\/2026/);
});
