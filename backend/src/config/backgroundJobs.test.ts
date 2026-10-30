import assert from "node:assert/strict";
import { test } from "node:test";
import { backgroundJobsEnabled } from "./backgroundJobs";

test("preserva o processamento no servidor principal", () => {
  assert.equal(backgroundJobsEnabled("true"), true);
});
test("desativa os agendadores da instancia reserva", () => {
  assert.equal(backgroundJobsEnabled("false"), false);
});
test("rejeita configuracao ambigua antes de iniciar", () => {
  assert.throws(() => backgroundJobsEnabled("0"));
});
