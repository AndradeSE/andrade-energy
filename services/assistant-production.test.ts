import assert from "node:assert/strict";
import test from "node:test";
import { detectProductionMetric, productionMetricReply } from "./assistant-production";
test("produção consulta dados, sem confundir tutorial de importação", () => {
  assert.equal(detectProductionMetric("Quanto minha usina produziu?"), "energiaGerada");
  assert.equal(detectProductionMetric("Qual a energia disponível?"), "energiaDisponivel");
  assert.equal(detectProductionMetric("Como importar produção por PDF?"), undefined);
  assert.match(productionMetricReply({ energiaGerada: 16040, competencia: "09/2026" }, "energiaGerada"), /16.040 kWh/);
  assert.match(productionMetricReply({ energiaGerada: 16040, competencia: "09/2026" }, "energiaGerada"), /09\/2026/);
  assert.match(productionMetricReply({}, "energiaGerada"), /Não vou estimar/);
});
