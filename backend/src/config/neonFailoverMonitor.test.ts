import { test } from "node:test";
import assert from "node:assert/strict";
import { automaticRecoveryEnabled, createNeonFailoverMonitor } from "./neonFailoverMonitor";

test("requires consecutive confirmed outages and recoveries and retries an unavailable snapshot", async () => {
  const probes = [false, null, false, false, false, false, true, false, true, true];
  const transitions: string[] = [];
  let attempts = 0;
  let stopped = 0;
  const tick = createNeonFailoverMonitor({
    probePrimary: async () => probes.shift() ?? null,
    activate: async () => ++attempts === 1 ? null : { stop() { stopped++; } },
    onTransition: async provider => { transitions.push(provider); },
  });

  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(transitions, []);
  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(transitions, ["NEON", "SUPABASE"]);
  assert.equal(attempts, 2);
  assert.equal(stopped, 1);
});

test("does not overlap probes and resets the count after a failed probe", async () => {
  let release!: (value: boolean) => void;
  let calls = 0;
  let activations = 0;
  const tick = createNeonFailoverMonitor({
    probePrimary: async () => {
      calls++;
      if (calls === 1) return new Promise<boolean>(resolve => { release = resolve; });
      if (calls === 2) throw new Error("connection reset");
      return false;
    },
    activate: async () => { activations++; return { stop() {} }; },
    onTransition: async () => {},
  });
  const first = tick();
  await tick();
  assert.equal(calls, 1);
  release(false);
  await first;
  await tick();
  await tick();
  assert.equal(activations, 0);
  await tick();
  assert.equal(activations, 1);
});
test("automatic recovery is opt-in and excludes serverless, distributed writes and manual recovery", () => {
  const enabled = { NEON_RECOVERY_AUTO: "true", NEON_API_ENABLED: "true" };
  assert.equal(automaticRecoveryEnabled(enabled), true);
  for (const override of [{ NEON_RECOVERY_AUTO: "false" }, { NEON_API_ENABLED: "false" },
    { API_RUNTIME: "serverless" }, { API_DISTRIBUTED_RATE_LIMIT: "true" }, { NEON_RECOVERY_READ_ONLY: "true" }]) {
    assert.equal(automaticRecoveryEnabled({ ...enabled, ...override }), false);
  }
});