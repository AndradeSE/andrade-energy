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

test("saldo de créditos da UC não é produção da usina", async () => {
  const { detectCapability } = await import("./assistant-capabilities");
  for (const question of ["Qual meu saldo de energia?", "Qual o saldo acumulado da UC?", "Qual saldo de créditos disponível?"]) {
    assert.equal(detectProductionMetric(question), undefined);
    assert.equal(detectCapability(question)?.module, "economia");
  }
  assert.equal(detectCapability("Qual meu saldo disponível?")?.module, "carteira");
});