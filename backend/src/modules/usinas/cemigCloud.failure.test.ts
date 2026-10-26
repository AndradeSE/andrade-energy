import test from 'node:test';
import assert from 'node:assert/strict';
import {mensagemFalhaCemig,type EtapaInicialCemig} from './cemigCloud.failure';
test('identifica a etapa sem expor exceções do provedor ou prometer nova tentativa',()=>{
 const etapas:EtapaInicialCemig[]=['ARQUIVO','PROVEDOR','CONEXAO','SESSAO','PORTAL','VISUALIZADOR','VALIDACAO'];
 const mensagens=etapas.map(mensagemFalhaCemig);
 assert.equal(new Set(mensagens).size,etapas.length);
 for(const mensagem of mensagens){assert.match(mensagem,/Nenhum protocolo/);assert.match(mensagem,/Nenhuma nova tentativa/);assert.doesNotMatch(mensagem,/https?:|token|senha/i);}
});
