import assert from "node:assert/strict";
import { test } from "node:test";
import { quotaNumber, quotaValidity } from "./quota-form";
test("quota form parses Brazilian readings without silently accepting partial or invalid numbers/dates", () => {
  assert.equal(quotaNumber("1.200,50"), 1200.5);
  assert.equal(quotaNumber("3000"), 3000);
  assert.equal(quotaNumber("3.000"), 3000);
  assert.equal(quotaNumber("0.12"), .12);
  assert.ok(Number.isNaN(quotaNumber("20abc")));
  assert.ok(Number.isNaN(quotaNumber("")));
  assert.equal(quotaValidity("31/02/2026"), "");
  assert.equal(quotaValidity("31/10/2026"), "2026-10-31T23:59:59-03:00");
});
