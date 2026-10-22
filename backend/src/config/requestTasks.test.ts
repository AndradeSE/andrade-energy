import assert from "node:assert/strict";
import { test } from "node:test";
import { trackRequestTask, withRequestTasks } from "./requestTasks";

test("lambda waits for response audit including nested work without sharing request state", async () => {
  const done: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = withRequestTasks(async () => {
    trackRequestTask(gate.then(() => { done.push("audit"); trackRequestTask(Promise.resolve().then(() => { done.push("nested"); })); }));
    return "first";
  });
  assert.equal(await withRequestTasks(async () => "second"), "second");
  assert.deepEqual(done, []);
  release();
  assert.equal(await first, "first");
  assert.deepEqual(done, ["audit", "nested"]);
});
