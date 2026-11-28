import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configuracaoAutoleitura, executorAutoleituraHabilitado } from './autoleituraConfig';

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

test("executor usa o padrao de producao e respeita configuracao explicita", () => {
  const producao = { SUPABASE_URL: "https://ehnkyrsseisvvtbkwrvu.supabase.co/" };
  const preview = { SUPABASE_URL: "https://qqhcjieymypowunkixmk.supabase.co" };
  assert.equal(executorAutoleituraHabilitado(producao), true);
  assert.equal(executorAutoleituraHabilitado({ ...producao, CEMIG_AUTOLEITURA_EXECUTOR_ENABLED: "false" }), false);
  assert.equal(executorAutoleituraHabilitado(preview), false);
  assert.equal(executorAutoleituraHabilitado({ ...preview, CEMIG_AUTOLEITURA_EXECUTOR_ENABLED: "true" }), true);
});
