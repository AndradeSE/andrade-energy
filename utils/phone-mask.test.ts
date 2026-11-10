import assert from 'node:assert/strict';
import test from 'node:test';
import { digitosTelefoneBrasil, mascaraTelefoneBrasil } from './phone-mask';
test('telefone tem máscara progressiva sem alterar os dígitos enviados ao servidor',()=>{
  for(const [raw,masked] of [['35991234567','(35) 99123-4567'],['3536221234','(35) 3622-1234'],['55991234567','(55) 99123-4567'],['5535991234567','(35) 99123-4567'],['','']]){
    assert.equal(mascaraTelefoneBrasil(raw),masked);
    assert.equal(mascaraTelefoneBrasil(masked),masked);
    assert.equal(digitosTelefoneBrasil(masked),digitosTelefoneBrasil(raw));
  }
});
