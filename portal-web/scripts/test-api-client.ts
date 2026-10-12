import assert from "node:assert/strict";
import { test } from "node:test";
import { apiFetch } from "../src/apiClient.ts";

test("expired private sessions trigger login; public errors and external calls do not", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const events: string[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent(event: Event) { events.push(event.type); return true; } } });
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  try {
    const privateResponse = await apiFetch("/api/faturas", { headers: { Authorization: "Bearer cookie-session" } });
    assert.equal(privateResponse.status, 401);
    assert.deepEqual(events, ["andrade-session-expired"]);
    await apiFetch("/api/auth/login", { method: "POST" });
    await apiFetch("/api/convites/test");
    await apiFetch("https://external.example.test/api/data", {});
    assert.equal(events.length, 1);
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    await apiFetch("/api/faturas", { headers: { Authorization: "Bearer cookie-session" } });
    assert.equal(events.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) Reflect.deleteProperty(globalThis, "window");
    else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }
});
