import { test } from "node:test";
import assert from "node:assert/strict";
import { janelaLeitura, proximaLeituraDaUnidade } from "./janela-leitura";

test("janela de cinco dias inclui início e fim e usa calendário brasileiro", () => {
  assert.equal(janelaLeitura("2026-11-15", "2026-11-09").permitida, false);
  assert.equal(janelaLeitura("2026-11-15", "2026-11-10").permitida, true);
  assert.equal(janelaLeitura("2026-11-15", "2026-11-15").permitida, true);
  assert.match(janelaLeitura("2026-11-15", "2026-11-16").texto, /estimativa/);
  assert.equal(janelaLeitura("2026-11-03", "2026-10-29").inicio, "2026-10-29");
  assert.equal(janelaLeitura("2026-02-30").permitida, false);
});
test("não usa a fatura de outra UC nem uma data antiga ausente na última fatura", () => {
  const faturas = [{ unidade_consumidora_id: "outra", proxima_leitura: "2026-11-12" },
    { unidade_consumidora_id: "atual", proxima_leitura: null },
    { unidade_consumidora_id: "atual", proxima_leitura: "2026-10-12" }];
  assert.equal(proximaLeituraDaUnidade(faturas, "atual"), null);
  assert.equal(proximaLeituraDaUnidade(faturas, "ausente"), undefined);
});
