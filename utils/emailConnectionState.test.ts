import test from 'node:test';
import assert from 'node:assert/strict';
import {emailConnectionState,gmailConnectionLabel} from './emailConnectionState';
test('autorização sem leitura confirmada não exige nova autorização nem promete conexão ativa',()=>{
 assert.equal(emailConnectionState({status:'LEITURA_AUTORIZADA',automatico:false}),'VALIDANDO');
 assert.equal(gmailConnectionLabel({status:'LEITURA_AUTORIZADA',automatico:false}),'Gmail autorizado · validando leitura');
 assert.equal(emailConnectionState({status:'LEITURA_AUTORIZADA',automatico:true}),'CONECTADO');
 assert.equal(emailConnectionState({status:'LEITURA_AUTORIZADA',automatico:true,erro:'Sem permissão'}),'REAUTORIZAR');
 assert.equal(emailConnectionState(), 'DESCONECTADO');
});
