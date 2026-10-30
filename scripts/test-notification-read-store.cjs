const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../utils/notificationReadStore.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { createNotificationReadStore } = compiled.exports;

async function test() {
  const data = new Map();
  let fail = false;
  const storage = { async getItem(k) { return data.get(k) ?? null; }, async setItem(k,v) { if(fail) throw Error('disk'); data.set(k,v); } };
  const store = createNotificationReadStore(storage);
  const seenA = [], seenB = [];
  const unsubscribe = store.subscribe('userA', ids => seenA.push(ids));
  store.subscribe('userA', ids => seenB.push(ids));
  await store.load('userA');
  await Promise.all([store.mark('userA', 'one'), store.load('userA'), store.mark('userA', 'two')]);
  assert.deepEqual(seenA.at(-1), ['one', 'two']);
  assert.deepEqual(seenB.at(-1), ['one', 'two']);
  assert.deepEqual(await createNotificationReadStore(storage).load('userA'), ['one', 'two']);
  assert.deepEqual(await store.load('userB'), []);
  data.set('andrade_energy_notificacoes_lidas', JSON.stringify(['vencida-old', 'vence-old', null]));
  assert.deepEqual(await store.load('userA'), ['one', 'two', 'old']);
  data.set('andrade_energy_notificacoes_lidas_userC', '{bad json');
  await store.mark('userC', 'three');
  assert.deepEqual(await store.load('userC'), ['old', 'three']);
  fail = true;
  await assert.rejects(store.mark('userA', 'failed'));
  assert(!seenA.at(-1).includes('failed'));
  fail = false;
  await store.mark('userA', 'retry');
  assert(seenA.at(-1).includes('retry'));
  unsubscribe();
  console.log('PASS: concurrent reads/writes, cross-header sync, restart persistence, account isolation, legacy IDs, corrupt data, write failure/retry');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
