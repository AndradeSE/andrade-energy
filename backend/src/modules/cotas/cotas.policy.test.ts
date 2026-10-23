import assert from "node:assert/strict";
import { test } from "node:test";
import { quotaBand, resendReadings, resendUsageKey, manualQuotaReading, brevoReading } from "./cotas.policy";
test("Brevo free credits are remaining daily sends; SMS and paid plans never become a fake free quota", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  const reading = brevoReading({ plan: [{ type: "sms", creditsType: "sendLimit", credits: 15 }, { type: "free", creditsType: "sendLimit", credits: 250 }] }, now);
  assert.equal(reading.usado, 50); assert.equal(reading.limite, 300);
  assert.equal(reading.renovaEm, "2026-10-23T00:00:00.000Z");
  for (const credits of [-1, 301, "250", null]) assert.throws(() => brevoReading({ plan: [{ type: "free", creditsType: "sendLimit", credits }] }, now));
  assert.throws(() => brevoReading({ plan: [{ type: "subscription", creditsType: "sendLimit", credits: 10000 }] }, now));
});
test("manual readings cannot impersonate an API collector or silently accept invalid or expired values", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  const input = { servico: "NETLIFY", metrica: "creditos", usado: 120.1, limite: 300, validaAte: "2026-10-31T23:59:59-03:00", confirmado: true };
  assert.equal(manualQuotaReading(input, now).origem, "PAINEL_CONFIRMADO");
  for (const change of [{ confirmado: false }, { usado: -1 }, { usado: "120" }, { limite: 0 }, { validaAte: "2020-01-01" }, { validaAte: "2090-01-01" }, { servico: "RESEND", metrica: "emails_mes" }]) {
    assert.throws(() => manualQuotaReading({ ...input, ...change }, now));
  }
});
test("usage monitor reuses the configured inbound key without exposing it or overriding a dedicated key", () => {
  assert.equal(resendUsageKey({ RESEND_INBOUND_API_KEY: " inbound-test " }), "inbound-test");
  assert.equal(resendUsageKey({ RESEND_USAGE_API_KEY: "usage-test", RESEND_INBOUND_API_KEY: "inbound-test" }), "usage-test");
  assert.equal(resendUsageKey({ RESEND_USAGE_API_KEY: " ", RESEND_API_KEY: "send-test" }), "send-test");
  assert.equal(resendUsageKey({}), "");
});
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
