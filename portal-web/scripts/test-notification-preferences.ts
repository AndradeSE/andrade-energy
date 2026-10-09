import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mergeNotificationIds, readNotificationIds } from "../src/notificationPreferences.ts";
test("lista aceita só IDs válidos, sem duplicatas, e tolera armazenamento inválido", () => {
  assert.deepEqual(readNotificationIds({ getItem: () => '{"id":"1"}' }, "test"), []);
  assert.deepEqual(readNotificationIds({ getItem: () => '["1",null,9,"1","2"]' }, "test"), ["1", "2"]);
  assert.deepEqual(readNotificationIds({ getItem: () => { throw Error("blocked"); } }, "test"), []);
});
test("limpar oculta somente os IDs atuais e mantém novos avisos visíveis", () => {
  const hidden = mergeNotificationIds(["old"], ["current", "current"]);
  assert.deepEqual(hidden, ["old", "current"]);
  assert.deepEqual(["old", "current", "new"].filter(id => !hidden.includes(id)), ["new"]);
});
test("armazenamento fica limitado aos 2000 IDs recentes", () => {
  const ids = Array.from({ length: 2100 }, (_, index) => String(index));
  assert.equal(mergeNotificationIds([], ids).length, 2000);
  assert.equal(readNotificationIds({ getItem: () => JSON.stringify(ids) }, "test")[0], "100");
});
