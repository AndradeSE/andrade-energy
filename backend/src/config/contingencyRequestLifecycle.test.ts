import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { createServer, request } from "node:http";
import { test } from "node:test";
import { continueReservedRequest } from "./contingencyRequestLifecycle";
import { withRequestTasks } from "./requestTasks";

function response() {
  const res = Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false, end: (..._args: any[]) => { res.writableEnded = true; return res; } });
  return res;
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

test("a route that finishes after disconnect releases once even without a finish event", async () => {
  const res = response(); let releases = 0; let businessFinished = false;
  await withRequestTasks(async () => {
    await continueReservedRequest(res as any, async () => {
      assert.equal(businessFinished, true); releases++;
    }, () => { res.destroyed = true; res.emit("close"); });
    assert.equal(releases, 0);
    businessFinished = true;
    res.end(); res.emit("finish");
  });
  assert.equal(releases, 1);
});

test("real HTTP cancellation holds ownership until the business handler ends", async () => {
  let enter!: () => void, complete!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const business = new Promise<void>(resolve => { complete = resolve; });
  const released = new Promise<void>(resolve => { release = resolve; });
  let releases = 0; let businessFinished = false;
  const server = createServer((_req, res) => {
    void continueReservedRequest(res, async () => { releases++; release(); }, () => {
      enter();
      void business.then(() => { businessFinished = true; res.end("done"); });
    });
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const address = server.address() as { port: number };
    const client = request(`http://127.0.0.1:${address.port}`);
    client.on("error", () => {}); client.end();
    await entered;
    const closed = new Promise<void>(resolve => client.once("close", resolve));
    client.destroy(); await closed;
    assert.equal(releases, 0);
    complete(); await released;
    assert.equal(businessFinished, true); assert.equal(releases, 1);
  } finally { server.close(); await once(server, "close"); }
});
