import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjection } from "../src/realDiscountCalculator.ts";

const gd2Invoice = {
  energia_injetada: 375,
  energia_compensada: 303,
  energia_compensada_gd2: 303,
  tarifa_cheia: 1.20907534,
  valor_cemig: 128.17,
  valor_energia_concessionaria: 63.0669278,
  custo_disponibilidade_gd2: 14.35,
  diferenca_fio_b: 48.75,
};

const expectedInjection = [
  { gd2: "REPASSAR", fioB: "REPASSAR", discount: 26.08 },
  { gd2: "ABSORVER", fioB: "REPASSAR", discount: 29.25 },
  { gd2: "REPASSAR", fioB: "ABSORVER", discount: 36.84 },
  { gd2: "ABSORVER", fioB: "ABSORVER", discount: 40 },
];

const expectedCompensation = [
  { gd2: "REPASSAR", fioB: "REPASSAR", discount: 22.78 },
  { gd2: "ABSORVER", fioB: "REPASSAR", discount: 26.69 },
  { gd2: "REPASSAR", fioB: "ABSORVER", discount: 36.08 },
  { gd2: "ABSORVER", fioB: "ABSORVER", discount: 40 },
];

for (const scenario of expectedCompensation) {
  test(`GD II compensação exata ${scenario.gd2}/${scenario.fioB}`, () => {
    const result = calculateProjection({ data: gd2Invoice, discount: 40, billingMode: "COMPENSACAO", type: "GD2", gd1: "REPASSAR", gd2: scenario.gd2, fioB: scenario.fioB });
    assert.ok(result);
    assert.equal(Number(result.realDiscount.toFixed(2)), scenario.discount);
  });
}

for (const scenario of expectedInjection) {
  for (const invoiceFormat of ["UNIFICADA", "SOMENTE_ANDRADE"]) {
    test(`GD II injeção ${scenario.gd2}/${scenario.fioB} ${invoiceFormat}`, () => {
      const result = calculateProjection({ data: gd2Invoice, discount: 40, billingMode: "INJECAO", type: "GD2", gd1: "REPASSAR", gd2: scenario.gd2, fioB: scenario.fioB });
      assert.ok(result);
      assert.equal(Number(result.realDiscount.toFixed(2)), scenario.discount);
      assert.ok(result.realDiscount >= 0 && result.realDiscount <= 40);
    });
  }
}

for (const mode of ["INJECAO", "COMPENSACAO"]) {
  for (const gd2 of ["REPASSAR", "ABSORVER"]) {
    for (const fioB of ["REPASSAR", "ABSORVER"]) {
      test(`matriz GD II ${mode} ${gd2}/${fioB}`, () => {
        const result = calculateProjection({ data: gd2Invoice, discount: 40, billingMode: mode, type: "GD2", gd1: "REPASSAR", gd2, fioB });
        assert.ok(result);
        assert.ok(result.savings >= 0);
        assert.ok(result.realDiscount >= 0 && result.realDiscount <= 40);
        assert.equal(result.absorbedAvailability > 0, gd2 === "ABSORVER");
        assert.equal(result.absorbedWireB > 0, fioB === "ABSORVER");
      });
    }
  }
}

test("GD I ignora Fio B e responde somente à disponibilidade", () => {
  const data = { ...gd2Invoice, energia_compensada_gd2: 0, energia_compensada_gd1: 303, custo_disponibilidade_gd1: 42, diferenca_fio_b: 0 };
  const repassed = calculateProjection({ data, discount: 40, billingMode: "COMPENSACAO", type: "GD1", gd1: "REPASSAR", gd2: "REPASSAR", fioB: "REPASSAR" });
  const absorbed = calculateProjection({ data, discount: 40, billingMode: "COMPENSACAO", type: "GD1", gd1: "ABSORVER", gd2: "REPASSAR", fioB: "ABSORVER" });
  assert.ok(repassed && absorbed);
  assert.equal(repassed.wireBCost, 0);
  assert.equal(absorbed.absorbedWireB, 0);
  assert.ok(absorbed.realDiscount > repassed.realDiscount);
});

test("conta convencional simula 100% do consumo com tarifa mensal GD II", () => {
  const result = calculateProjection({
    data: { consumo_kwh: "303,00", valor_total: "R$ 431,45", valor_energia_concessionaria: "R$ 366,35", tarifa_cheia: "1,20907534", franquia_disponibilidade_kwh: 50, tarifa_disponibilidade_sem_impostos: "0,9221" },
    discount: 40,
    billingMode: "COMPENSACAO",
    type: "GD2",
    gd1: "REPASSAR",
    gd2: "REPASSAR",
    fioB: "REPASSAR",
    projectedConsumption: 303,
    sceeReference: 0.62352,
    gd2Reference: 0.4626174,
  });
  assert.ok(result);
  assert.equal(Number(result.wireBCost.toFixed(2)), 48.75);
  assert.ok(result.realDiscount > 0 && result.realDiscount <= 40);
});
