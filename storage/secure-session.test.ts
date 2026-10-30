import assert from "node:assert/strict";
import test from "node:test";
import { createSecureSession } from "./secure-session";
function memory() {
  const values = new Map<string, string>();
  return { values, async getItem(key: string) { return values.get(key) ?? null; }, async setItem(key: string, value: string) { values.set(key, value); }, async removeItem(key: string) { values.delete(key); } };
}
test("migra sessão legada e remove a cópia em texto do AsyncStorage", async () => {
  const secure = memory(), legacy = memory();
  legacy.values.set("old", JSON.stringify({ token: "token-teste", nome: "Teste" }));
  const store = createSecureSession(secure, legacy, "old", "safe");
  assert.equal((await store.get()).token, "token-teste");
  assert.equal(legacy.values.size, 0);
  assert.equal((await store.get()).nome, "Teste");
});
test("sessão grande com unicode usa blocos pequenos e não perde dados", async () => {
  const secure = memory(), legacy = memory();
  const store = createSecureSession(secure, legacy, "old", "safe");
  const value = { token: "x".repeat(5000), nome: "☀️🔆".repeat(700) };
  await store.save(value);
  assert.deepEqual(await store.get(), value);
  for (const part of secure.values.values()) assert.ok(Buffer.byteLength(part) < 2048);
});
test("falha ao gravar não publica sessão parcial nem apaga sessão anterior", async () => {
  const secure = memory(), legacy = memory();
  const store = createSecureSession(secure, legacy, "old", "safe");
  await store.save({ token: "anterior" });
  const set = secure.setItem;
  secure.setItem = async (key, value) => { if (key.endsWith(".1")) throw new Error("cofre indisponível"); return set(key, value); };
  await assert.rejects(store.save({ token: "x".repeat(2000) }), /cofre indisponível/);
  assert.equal((await store.get()).token, "anterior");
});
test("logout concorrente não permite que migração restaure sessão", async () => {
  const secure = memory(), legacy = memory();
  legacy.values.set("old", JSON.stringify({ token: "legado" }));
  const store = createSecureSession(secure, legacy, "old", "safe");
  await Promise.all([store.get(), store.remove()]);
  assert.equal(await store.get(), null);
  assert.equal(secure.values.size, 0);
  assert.equal(legacy.values.size, 0);
});
