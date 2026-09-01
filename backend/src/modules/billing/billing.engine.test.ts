import assert from "node:assert/strict";
import test from "node:test";
import { calcularDiferencaFioB, calcularFaturaUnificada } from "./billing.engine";

const base = {
  modalidade: "COMPENSACAO" as const,
  energiaInjetada: 0,
  energiaCompensada: 300,
  tarifaCheia: 1,
  descontoPercentual: 40,
  valorCemig: 200,
  valorCreditoEfetivo: 300,
  custoDisponibilidadeRepassavel: 60,
  diferencaFioBRepassavel: 90,
};

test("calcula o Fio B pela diferença entre SCEE e compensação GD II", () => {
  assert.equal(calcularDiferencaFioB(303, 0.62352, 0.4626174), 48.75);
  assert.equal(calcularDiferencaFioB(303, 0, 0.4626174), 0);
});

test("mantém os custos na CEMIG quando a UC repassa disponibilidade e Fio B", () => {
  const resultado = calcularFaturaUnificada({
    ...base,
    repassarCustoDisponibilidade: true,
    repassarDiferencaFioBGD2: true,
  });

  assert.equal(resultado.valorCemigRepassado, 200);
  assert.equal(resultado.valorUsina, 180);
  assert.equal(resultado.valorTotalUnificado, 380);
  assert.equal(resultado.valorTotalAbsorvido, 0);
});

test("deduz da fatura Andrade os custos absorvidos pela usina", () => {
  const resultado = calcularFaturaUnificada({
    ...base,
    repassarCustoDisponibilidade: false,
    repassarDiferencaFioBGD2: false,
  });

  assert.equal(resultado.valorCemig, 200);
  assert.equal(resultado.valorCemigRepassado, 200);
  assert.equal(resultado.valorUsina, 30);
  assert.equal(resultado.valorTotalAbsorvido, 150);
  assert.equal(resultado.valorTotalUnificado, 230);
  assert.equal(resultado.economiaReal, 120);
});

test("nunca reduz a fatura Andrade abaixo de zero", () => {
  const resultado = calcularFaturaUnificada({
    ...base,
    valorCemig: 100,
    repassarCustoDisponibilidade: false,
    repassarDiferencaFioBGD2: false,
  });

  assert.equal(resultado.valorCemigRepassado, 100);
  assert.equal(resultado.valorTotalAbsorvido, 150);
  assert.equal(resultado.valorTotalUnificado, 130);
});
