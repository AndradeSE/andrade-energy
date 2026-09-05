import assert from "node:assert/strict";
import test from "node:test";
import { calcularAlocacaoProjetada } from "./usinas.service";

test("compensacao usa consumo medio com margem de 15%, mesmo com percentual antigo em 100%", () => {
  const resultado = calcularAlocacaoProjetada([
    { modalidade_faturamento: "COMPENSACAO", consumo_medio_kwh: 271, percentual_rateio: 100 },
  ], 14_000);

  assert.equal(resultado.energia_alocada, 311.65);
  assert.equal(Number(resultado.ocupacao.toFixed(2)), 2.23);
  assert.equal(resultado.energia_disponivel, 13_688.35);
});

test("injecao preserva a cota percentual configurada", () => {
  const resultado = calcularAlocacaoProjetada([
    { modalidade_faturamento: "INJECAO", consumo_medio_kwh: 271, percentual_rateio: 25 },
  ], 14_000);

  assert.equal(resultado.energia_alocada, 3_500);
  assert.equal(resultado.ocupacao, 25);
});
