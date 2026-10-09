import assert from "node:assert/strict";
import { test } from "node:test";
import { transferAttempt } from "../src/transferAttempt.ts";
test("retry after a lost transfer response reuses the request key", () => {
  let keys = 0;
  const key = () => `test-${++keys}`;
  const first = transferAttempt(null, 100, "account-a", key);
  assert.equal(transferAttempt(first, 100, "account-a", key).key, first.key);
  assert.equal(keys, 1);
  assert.notEqual(transferAttempt(first, 101, "account-a", key).key, first.key);
  assert.notEqual(transferAttempt(first, 100, "account-b", key).key, first.key);
});
test("invalid amounts never create a transfer attempt", () => {
  for (const amount of [0, -1, NaN, Infinity]) assert.throws(() => transferAttempt(null, amount, "account", () => { throw new Error("Should not generate a key"); }), /valor de transferência/);
});
