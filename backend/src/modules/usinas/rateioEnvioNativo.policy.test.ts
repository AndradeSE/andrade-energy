import test from 'node:test';
import assert from 'node:assert/strict';
import {conferirArtefatoEnvio,conferirTransicaoEnvio,conferirAutorizacaoEnvio,estadoAposInterrupcao,copiaDiagnosticaAutorizada} from './rateioEnvioNativo.policy';
const plano={rascunho:false,formatoCemig:true,competencia:'2026-10',pendencias:[],arquivo:'cemig-2026-10-1121361801894.csv',csv:'607081301889;11111111111;100;X'};
test('envio autorizado limita competência e hash; revogação bloqueia qualquer modo',()=>{
 const job={competencia:'2026-10-01',csv_hash:'a'.repeat(64)};
 const config={habilitado:true,modo:'AUTORIZADO',competencia_autorizada:job.competencia,hash_autorizado:job.csv_hash};
 assert.doesNotThrow(()=>conferirAutorizacaoEnvio(config,job));
 for(const change of [{habilitado:false},{competencia_autorizada:'2026-11-01'},{hash_autorizado:'b'.repeat(64)},{modo:'OUTRO'}])assert.throws(()=>conferirAutorizacaoEnvio({...config,...change},job));
 assert.doesNotThrow(()=>conferirAutorizacaoEnvio({habilitado:true,modo:'AUTOMATICO'},job));
});
test('só enfileira CSV íntegro de competência e geradora identificadas',()=>{
 assert.equal(conferirArtefatoEnvio(plano).geradora,'1121361801894');
 for(const alteracao of [{rascunho:true},{pendencias:['fatura faltante']},{arquivo:'arquivo.csv'},{csv:'607081301889;11111111111;99;X'},{csv:plano.csv+'\r\n'+plano.csv}])assert.throws(()=>conferirArtefatoEnvio({...plano,...alteracao}));
});
test('reinício depois de enviar fica incerto e não autoriza nova tentativa',()=>{
 assert.equal(estadoAposInterrupcao('ENVIANDO'),'INCERTO');
 assert.throws(()=>conferirTransicaoEnvio('INCERTO','EXECUTANDO',false));
 assert.throws(()=>conferirTransicaoEnvio('PROTOCOLADO','EXECUTANDO',false));
 assert.equal(estadoAposInterrupcao('EXECUTANDO'),'AGUARDANDO_USUARIO');
});
test('Preview para na revisão e recebimento exige protocolo verificável',()=>{
 conferirTransicaoEnvio('EXECUTANDO','REVISAO',true);
 assert.throws(()=>conferirTransicaoEnvio('REVISAO','ENVIANDO',true));
 assert.throws(()=>conferirTransicaoEnvio('ENVIANDO','PROTOCOLADO',false));
 conferirTransicaoEnvio('ENVIANDO','PROTOCOLADO',false,'123456789');
});
test('cópia técnica preserva original, titular e total e só corrige as UCs autorizadas',()=>{
 const source={...plano,csv:'99999101128;11111111111;0,6234;\r\n3006605532;22222222222;94,6198;X\r\n1222790201827;33333333333;4,7568;'};
 const before=source.csv;const copy=copiaDiagnosticaAutorizada(source);
 assert.equal(source.csv,before);assert.ok(copy.csv.includes('607081301889;22222222222;95,2432;X'));assert.ok(!copy.csv.includes('99999101128'));
 assert.throws(()=>copiaDiagnosticaAutorizada({...source,competencia:'2026-11'}));
 assert.throws(()=>copiaDiagnosticaAutorizada({...source,csv:source.csv.replace('3006605532','607081301889')}));
});
