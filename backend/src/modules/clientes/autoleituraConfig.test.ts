import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configuracaoAutoleitura } from './autoleituraConfig';

test('cadastros antigos não têm a configuração alterada implicitamente', () => {
  assert.deepEqual(configuracaoAutoleitura({}), {});
});
test('permite habilitar autoleitura rural e desabilitar sem mudar a zona', () => {
  for (const ativa of [true, false]) {
    assert.deepEqual(configuracaoAutoleitura({ zona_localizacao: 'RURAL', autoleitura_rural_ativa: ativa }), {
      zona_localizacao: 'RURAL', autoleitura_rural_ativa: ativa,
    });
  }
});
test('UC urbana não pode ativar o fluxo rural', () => {
  assert.throws(() => configuracaoAutoleitura({ zona_localizacao: 'URBANA', autoleitura_rural_ativa: true }));
  assert.deepEqual(configuracaoAutoleitura({ zona_localizacao: 'URBANA', autoleitura_rural_ativa: false }), {
    zona_localizacao: 'URBANA', autoleitura_rural_ativa: false,
  });
});
test('não converte texto false ou campos incompletos em autorização de envio', () => {
  for (const input of [
    { zona_localizacao: 'RURAL', autoleitura_rural_ativa: 'false' },
    { zona_localizacao: 'RURAL' }, { autoleitura_rural_ativa: true },
    { zona_localizacao: null, autoleitura_rural_ativa: false },
  ]) assert.throws(() => configuracaoAutoleitura(input));
});
