import assert from "node:assert/strict";
import { test } from "node:test";
import { quotaBand, resendReadings } from "./cotas.policy";
test("only confirmed usage triggers the appropriate quota band; uncapped and unknown are not zero balances", () => {
  assert.equal(quotaBand(79,100),0); assert.equal(quotaBand(80,100),80);
  assert.equal(quotaBand(90,100),90); assert.equal(quotaBand(120,100),100);
  assert.equal(quotaBand(100,null),0); assert.equal(quotaBand(NaN,100),0);
});
test("Resend uses account totals including inbound email and preserves unlimited quota", () => {
  const now=Date.parse("2026-10-22T00:00:00Z");
  const result=resendReadings({ emails: { daily: { used:90,sent:80,received:10,limit:100,resets_at:"2026-10-23T00:00:00Z" },
    monthly:{used:100,limit:null,resets_at:"2026-11-01T00:00:00Z"} } },now);
  assert.equal(result[0].usado,90); assert.equal(result[1].limite,null);
  assert.throws(()=>resendReadings({emails:{daily:{used:0,limit:100,resets_at:"invalid"}}},now));
});
