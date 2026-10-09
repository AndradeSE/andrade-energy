const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const path = require('node:path');
function setup(suffix = '') {
  const plain = new Map(), secure = new Map();
  let fail = false;
  const filename = path.resolve(__dirname, '../storage/session.ts');
  const compiled = new Module(filename, module);
  compiled.require = name => {
    if (name === '@react-native-async-storage/async-storage') return {
      getItem: async k => plain.get(k) ?? null,
      setItem: async (k, v) => plain.set(k, v), removeItem: async k => plain.delete(k),
    };
    if (name === 'expo-secure-store') return {
      getItemAsync: async k => secure.get(k) ?? null,
      setItemAsync: async (k, v) => { if (fail) throw Error('cofre indisponível'); secure.set(k, v); },
      deleteItemAsync: async k => secure.delete(k),
    };
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === '../config/environment') return { environmentKeySuffix: suffix };
    throw Error(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
  return { api: compiled.exports, plain, secure, fail: value => { fail = value; } };
}
(async () => {
  const s = setup('_preview');
  const legacyKey = '@andrade_energy_usuario_preview';
  const session = { token: 'token-apenas-teste', user: { id: 'teste' } };
  s.plain.set(legacyKey, JSON.stringify(session));
  s.fail(true);
  await assert.rejects(s.api.obterSessao(), /cofre/);
  assert.ok(s.plain.has(legacyKey), 'migração falha preserva o original para nova tentativa');
  s.fail(false);
  assert.deepEqual(await s.api.obterSessao(), session);
  assert.equal(s.plain.has(legacyKey), false);
  assert.ok(s.secure.has('andrade_energy_sessao_preview'));
  const read = s.api.obterSessao();
  const logout = s.api.removerSessao();
  await Promise.all([read, logout]);
  assert.equal(await s.api.obterSessao(), null, 'leitura concorrente não ressuscita sessão removida');
  s.fail(true);
  await assert.rejects(s.api.salvarSessao(session), /cofre/);
  assert.equal(s.plain.size, 0, 'falha nunca grava token em texto simples');
  s.fail(false);
  await s.api.salvarSessao(session);
  assert.equal(s.plain.size, 0);
  const prod = setup();
  assert.equal(await prod.api.obterSessao(), null);
  await s.api.removerSessao();
  s.plain.set(legacyKey, '{corrompida');
  assert.equal(await s.api.obterSessao(), null);
  console.log('PASS: sessão nativa protegida, migração segura, falha sem downgrade, logout concorrente e isolamento preview');
})().catch(error => { console.error(error); process.exitCode = 1; });
