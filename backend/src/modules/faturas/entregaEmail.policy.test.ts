import test from 'node:test';
import assert from 'node:assert/strict';
import {estadoEntrega} from './entregaEmail.policy';
test('aceite do envio não comprova entrega e outro ID não altera o estado',()=>{
 assert.equal(estadoEntrega('RESEND',{id:'a',last_event:'sent'},'a'),null);
 assert.equal(estadoEntrega('RESEND',{id:'b',last_event:'delivered'},'a'),null);
 assert.equal(estadoEntrega('BREVO',{events:[{messageId:'b',event:'delivered'}]},'a'),null);
});
test('somente eventos confirmados do ID correto geram entrega ou falha',()=>{
 assert.equal(estadoEntrega('RESEND',{id:'a',last_event:'delivered'},'a'),'ENTREGUE');
 assert.equal(estadoEntrega('RESEND',{id:'a',last_event:'bounced'},'a'),'FALHOU');
 assert.equal(estadoEntrega('BREVO',{events:[{messageId:'a',event:'delivered'}]},'a'),'ENTREGUE');
 assert.equal(estadoEntrega('BREVO',{events:[{messageId:'a',event:'hardBounces'}]},'a'),'FALHOU');
});
