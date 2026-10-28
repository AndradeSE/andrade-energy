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
test('falha temporária de servidor não manda reautorizar o Gmail',()=>{
 for(const erro of ['Servidor em troca controlada. Atualize a tela antes de tentar novamente.','HTTP 503','Tempo de conexão esgotado']){
  assert.equal(emailConnectionState({status:'ERRO',automatico:true,erro}),'VALIDANDO');
  assert.doesNotMatch(gmailConnectionLabel({status:'ERRO',erro}),/Reconectar/);
 }
 assert.equal(emailConnectionState({status:'ERRO',erro:'invalid_grant'}),'REAUTORIZAR');
 assert.equal(emailConnectionState({status:'ERRO',erro:'GMAIL_LEITURA_NAO_AUTORIZADA'}),'REAUTORIZAR');
});
