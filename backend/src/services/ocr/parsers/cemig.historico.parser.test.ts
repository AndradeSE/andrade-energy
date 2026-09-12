import assert from "node:assert/strict";
import test from "node:test";

import { extrairHistoricoConsumo } from "./cemig.historico.parser";

test("interpreta consumo com ponto de milhar", () => {
  const historico = extrairHistoricoConsumo("SET/26 5.400 186,20 29\nAGO/26 0 0,00 0");

  assert.equal(historico[0].mes, "SET/26");
  assert.equal(historico[0].consumo, 5400);
  assert.equal(historico[0].dias, 29);
});

test("preserva layout antigo sem separador de milhar", () => {
  const historico = extrairHistoricoConsumo("SET/11 1268 26,98 47\nAGO/11 681 22,70 30");

  assert.deepEqual(historico.map((item) => item.consumo), [1268, 681]);
});
