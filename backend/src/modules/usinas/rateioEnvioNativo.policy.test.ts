import test from 'node:test';
import assert from 'node:assert/strict';
import {conferirArtefatoEnvio,conferirTransicaoEnvio,estadoAposInterrupcao} from './rateioEnvioNativo.policy';
const plano={rascunho:false,formatoCemig:true,competencia:'2026-10',pendencias:[],arquivo:'cemig-2026-10-1121361801894.csv',csv:'607081301889;11111111111;100;X'};
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
