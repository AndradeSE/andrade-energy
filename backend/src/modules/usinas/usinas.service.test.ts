import assert from "node:assert/strict";
import test from "node:test";
import { calcularAlocacaoProjetada } from "./usinas.service";

test("compensacao usa consumo medio sem margem adicional, mesmo com percentual antigo em 100%", () => {
  const resultado = calcularAlocacaoProjetada([
    { modalidade_faturamento: "COMPENSACAO", consumo_medio_kwh: 271, percentual_rateio: 100 },
  ], 14_000);

  assert.equal(resultado.energia_alocada, 271);
  assert.equal(Number(resultado.ocupacao.toFixed(2)), 1.94);
  assert.equal(resultado.energia_disponivel, 13_729);
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

  assert.equal(Number(resultado.energia_alocada.toFixed(2)), 356);
  assert.equal(Number(resultado.energia_disponivel.toFixed(2)), 13_644);
  assert.equal(Number(resultado.ocupacao.toFixed(2)), 2.54);
});
