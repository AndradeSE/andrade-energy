import assert from "node:assert/strict";
import test from "node:test";
import { ordemCompetencia } from "./competencia.policy";

test("outubro com compensação substitui setembro zerado no painel", () => {
  const faturas = [{ referencia: "SET/2026", energia: 0 }, { referencia: "OUT/2026", energia: 5880 }];
  const ultima = faturas.sort((a, b) => ordemCompetencia(b.referencia) - ordemCompetencia(a.referencia))[0];
  assert.equal(ultima.energia, 5880);
});

test("competências de formatos diferentes respeitam mês e ano", () => {
  assert.equal(ordemCompetencia("OUT/2026"), ordemCompetencia("2026-10-01"));
  assert.equal(ordemCompetencia("10/2026"), ordemCompetencia("2026-10"));
  assert.ok(ordemCompetencia("JAN/2027") > ordemCompetencia("DEZ/2026"));
  assert.equal(ordemCompetencia(null), 0);
  assert.equal(ordemCompetencia("2026-13"), 0);
});
