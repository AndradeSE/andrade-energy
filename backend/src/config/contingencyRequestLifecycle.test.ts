import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { continueReservedRequest } from "./contingencyRequestLifecycle";
import { withRequestTasks } from "./requestTasks";

function response() {
  return Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false });
}

test("a disconnect during reservation releases without running the route", async () => {
  const res = response(); res.destroyed = true;
  let releases = 0; let dispatches = 0;
  await continueReservedRequest(res as any, async () => { releases++; }, () => { dispatches++; });
  assert.equal(releases, 1); assert.equal(dispatches, 0);
});

test("a completed response during reservation cannot run the route again", async () => {
  const res = response(); res.writableEnded = true;
  let releases = 0;
  await continueReservedRequest(res as any, async () => { releases++; }, () => assert.fail("route already ended"));
  assert.equal(releases, 1);
});

test("normal completion awaits the reservation audit before Lambda returns", async () => {
  const res = response(); let released = false;
  await withRequestTasks(async () => {
    await continueReservedRequest(res as any, async () => {
      await new Promise<void>(resolve => setImmediate(resolve)); released = true;
    }, () => { res.emit("finish"); });
  });
  assert.equal(released, true);
});

test("disconnect after dispatch never hides uncertain business work", async () => {
  const res = response(); let releases = 0;
  await continueReservedRequest(res as any, async () => { releases++; }, () => {
    res.destroyed = true; res.emit("close");
  });
  assert.equal(releases, 0);
});
