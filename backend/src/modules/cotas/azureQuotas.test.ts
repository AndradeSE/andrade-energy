import assert from "node:assert/strict";
import { test } from "node:test";
import { azureQuotaConfig, azureQuotaReadings, fetchAzureQuotaReadings } from "./azureQuotas";
const now = Date.parse("2026-10-23T18:00:00Z");
const payload = (total: unknown = 400000) => ({ value: [{ name: { value: "SynthesizedCharacters" }, timeseries: [{ data: [{ timeStamp: "2026-10-23T00:00:00Z", total }] }] },
  { name: { value: "AudioSecondsTranscribed" }, timeseries: [{ data: [{ timeStamp: "2026-10-22T00:00:00Z", total: 7200 }] }] }] });
test("Azure F0 uses registered month-to-date characters and audio seconds, with UTC month renewal", () => {
  const readings = azureQuotaReadings(payload(), "F0", now);
  assert.equal(readings[0].usado, 400000); assert.equal(readings[0].limite, 500000);
  assert.equal(readings[1].usado, 2); assert.equal(readings[1].limite, 5);
  assert.equal(readings[0].renovaEm, "2026-11-01T00:00:00.000Z");
  assert.throws(() => azureQuotaReadings(payload(), "S0", now), /PLANO_NAO_SUPORTADO/);
});
test("missing metrics, invalid points and split dimensions never become free quota", () => {
  assert.deepEqual(azureQuotaReadings({ value: [] }, "F0", now), []);
  for (const value of [null, undefined, -1, "400", NaN]) {
    const sample = payload(); sample.value[0].timeseries[0].data[0].total = value;
    assert.equal(azureQuotaReadings(sample, "F0", now).some(r => r.metrica === "voz_caracteres_mes"), false);
  }
  const invalid = payload(); invalid.value[0].timeseries[0].data[0].timeStamp = "2026-09-30T00:00:00Z";
  assert.equal(azureQuotaReadings(invalid, "F0", now).length, 1);
  const split = payload(); split.value[0].timeseries.push(split.value[0].timeseries[0]);
  assert.equal(azureQuotaReadings(split, "F0", now).length, 1);
  assert.equal(azureQuotaReadings(payload(0), "F0", now)[0].usado, 0);
});
test("invalid resource URLs and missing credentials fail closed without an outbound request", async () => {
  assert.equal(azureQuotaConfig({AZURE_QUOTA_RESOURCE_ID:"https://evil.invalid", AZURE_QUOTA_TENANT_ID:"tenant"}), null);
  let called = false;
  await assert.rejects(fetchAzureQuotaReadings({}, (async () => { called=true; throw new Error("not allowed"); }) as any, now), /SEM_CHAVE/);
  assert.equal(called,false);
});
