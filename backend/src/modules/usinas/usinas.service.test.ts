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

test("injecao integral aloca 100% da produção da usina", () => {
  const resultado = calcularAlocacaoProjetada([
    { modalidade_faturamento: "INJECAO", consumo_medio_kwh: 271, percentual_rateio: 100 },
  ], 14_000);

  assert.equal(resultado.energia_alocada, 14_000);
  assert.equal(Number(resultado.ocupacao.toFixed(2)), 100);
});

test("ocupacao respeita a parcela da usina na injecao", () => {
  const resultado = calcularAlocacaoProjetada([
    { modalidade_faturamento: "INJECAO", consumo_medio_kwh: 271, percentual_rateio: 2 },
    { modalidade_faturamento: "COMPENSACAO", consumo_medio_kwh: 76, percentual_rateio: 0.62 },
  ], 14_000);

  assert.equal(Number(resultado.energia_alocada.toFixed(2)), 367.4);
  assert.equal(Number(resultado.energia_disponivel.toFixed(2)), 13_632.6);
  assert.equal(Number(resultado.ocupacao.toFixed(2)), 2.62);
});
