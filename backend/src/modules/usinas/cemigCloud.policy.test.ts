import assert from 'node:assert/strict';
import test from 'node:test';
import {exigirCemigSimulacao,exigirPortalNuvemValidado,CEMIG_PREVIEW_DB,conferirCsvSimulacao,conferirMinutosGratuitos,urlLivePermitida} from './cemigCloud.policy';
import {leituraBrowserbase} from '../cotas/browserbaseQuota';

test('nuvem bloqueia produção mesmo com flag ligada e bloqueia Preview desligado',()=>{
 assert.doesNotThrow(()=>exigirCemigSimulacao({SUPABASE_URL:CEMIG_PREVIEW_DB,CEMIG_CLOUD_ENABLED:'true'}));
 for(const env of [{SUPABASE_URL:'https://production.supabase.co',CEMIG_CLOUD_ENABLED:'true'},{SUPABASE_URL:CEMIG_PREVIEW_DB},{SUPABASE_URL:CEMIG_PREVIEW_DB+'.evil.test',CEMIG_CLOUD_ENABLED:'true'}])assert.throws(()=>exigirCemigSimulacao(env));
});
test('sessão só inicia com dez minutos de margem confirmada',()=>{
 for(const n of [0,30,40])assert.doesNotThrow(()=>conferirMinutosGratuitos(n));
 for(const n of [40.1,60,-1,null,undefined,'0',NaN,Infinity])assert.throws(()=>conferirMinutosGratuitos(n));
});
test('portal não validado bloqueia novas tentativas antes de reservar cota',()=>{
 for(const valor of [undefined,'','false','1'])assert.throws(()=>exigirPortalNuvemValidado({CEMIG_CLOUD_PORTAL_VALIDATED:valor}),/suspensas/);
 assert.doesNotThrow(()=>exigirPortalNuvemValidado({CEMIG_CLOUD_PORTAL_VALIDATED:'true'}));
});
test('CSV inválido nunca chega ao portal: total, duplicatas, documento e âncora',()=>{
 const csv='1111111111111;00000000000;30;\n2222222222222;00000000000;70;X';
 assert.doesNotThrow(()=>conferirCsvSimulacao(csv+'\r\n','3333333333333'));
 for(const v of [csv.replace(';70;',';69;'),csv.replace('2222222222222','1111111111111'),csv.replace('70;X','70;'),csv.replace('00000000000','cpf'),csv.replace('30;','-30;'),csv+'\n\n'])assert.throws(()=>conferirCsvSimulacao(v,'3333333333333'));
});
test('live view não permite link arbitrário, HTTP, credencial embutida ou domínio parecido',()=>{
 assert.match(urlLivePermitida('https://www.browserbase.com/devtools/session?token=test'),/^https:/);
 for(const url of ['http://browserbase.com','https://browserbase.com.evil.test','https://browserbase.com@evil.test','https://user:password@browserbase.com','javascript:alert(1)'])assert.throws(()=>urlLivePermitida(url));
});
test('indicador usa minutos reais e nunca inventa zero ou renovação',()=>{
 assert.equal(leituraBrowserbase(12.5).leitura.restante,47.5);
 assert.equal(leituraBrowserbase(61).leitura.restante,0);
 assert.equal(leituraBrowserbase(0).leitura.renova_em,null);
 for(const value of [null,undefined,'0',-1,NaN,Infinity])assert.throws(()=>leituraBrowserbase(value));
});
