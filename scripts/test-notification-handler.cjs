const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../services/carteira-notificacoes.service.ts');
const storage = new Map();
const state = { currentState: 'active' };
let handlerChanges = 0;
const scheduled = [];
const notifications = {
  setNotificationHandler() { handlerChanges++; },
  setBadgeCountAsync: async () => {},
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'granted' }),
  scheduleNotificationAsync: async (notice) => scheduled.push(notice),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
};
const compiled = new Module(filename, module);
compiled.require = (name) => {
  if (name === 'react-native') return { AppState: state, Platform: { OS: 'android' } };
  if (name === 'expo-notifications') return notifications;
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => storage.set(key, value),
  };
  throw new Error(`Dependência inesperada: ${name}`);
};
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
async function run() {
  await compiled.exports.marcarCarteiraComoVista();
  assert.equal(handlerChanges, 0, 'Abrir a carteira deve preservar o handler de push global');
  const aviso = { usuarioId: 'teste', id: 'primeiro', titulo: 'Teste', detalhe: 'Teste' };
  assert.equal(await compiled.exports.notificarAvisoNoAndroid(aviso), false);
  assert.equal(scheduled.length, 0, 'Aviso local não deve duplicar o sino em primeiro plano');
  state.currentState = 'background';
  const segundo = { ...aviso, id: 'segundo' };
  assert.equal(await compiled.exports.notificarAvisoNoAndroid(segundo), true);
  assert.equal(await compiled.exports.notificarAvisoNoAndroid(segundo), false);
  assert.equal(scheduled.length, 1, 'Aviso local deve ser enviado só uma vez');
  assert.equal(handlerChanges, 0, 'Aviso local também deve preservar o handler global');
  console.log('PASS: carteira preserva push global, evita duplicação em primeiro plano e deduplica aviso em segundo plano');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
