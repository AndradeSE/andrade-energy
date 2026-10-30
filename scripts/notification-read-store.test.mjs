import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationReadStore } from '../utils/notificationReadStore.ts';

function fixture() {
  const values = new Map();
  const storage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  };
  return { storage, values, store: createNotificationReadStore(storage) };
}

test('marcar todas preserva leituras anteriores e remove duplicatas', async () => {
  const { store } = fixture();
  await store.mark('user', 'old');
  await store.markMany('user', ['new', 'new', 'vence-invoice']);
  assert.deepEqual(await store.load('user'), ['old', 'new', 'invoice']);
});

test('leituras concorrentes individuais e em lote não se perdem', async () => {
  const { store } = fixture();
  await Promise.all([store.markMany('user', ['one', 'two']), store.mark('user', 'three')]);
  assert.deepEqual(await store.load('user'), ['one', 'two', 'three']);
  assert.deepEqual(await store.load('other-user'), []);
});

test('falha de persistência não informa sucesso nem altera a lista', async () => {
  const { storage, store } = fixture();
  await store.mark('user', 'old');
  storage.setItem = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(store.markMany('user', ['new']));
  assert.deepEqual(await store.load('user'), ['old']);
});
