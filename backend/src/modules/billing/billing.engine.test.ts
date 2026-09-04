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
  assert.equal(resultado.economiaReal, 70);
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

test("usa a tarifa cheia com impostos sem duplicar os tributos destacados", () => {
  const resultado = calcularFaturaUnificada({
    ...base,
  });

  assert.equal(resultado.valorReferenciaSemAndrade, 300);
});

test("na fatura separada cobra somente a Andrade sem alterar a economia global", () => {
  const resultado = calcularFaturaUnificada({
    ...base,
    valorCemig: 80,
    valorEnergiaConcessionaria: 80,
    faturaSomenteAndrade: true,
    repassarCustoDisponibilidade: true,
    repassarDiferencaFioBGD2: true,
  });

  assert.equal(resultado.valorUsina, 180);
  assert.equal(resultado.valorTotalUnificado, 180);
  assert.equal(resultado.valorCemig, 80);
  assert.equal(resultado.economiaReal, 40);
});

const faturaRealGd2Injecao = {
  modalidade: "INJECAO" as const,
  energiaInjetada: 375,
  energiaCompensada: 303,
  tarifaCheia: 1.20907534,
  descontoPercentual: 40,
  valorCemig: 128.17,
  valorEnergiaConcessionaria: 63.0669278,
  custoDisponibilidadeRepassavel: 14.35,
  diferencaFioBRepassavel: 48.75,
  baseDescontoReal: 375 * 1.20907534,
};

const cenariosGd2 = [
  { disponibilidade: true, fioB: true, valorAndrade: 272.04, economia: 118.29, desconto: 26.0903 },
  { disponibilidade: false, fioB: true, valorAndrade: 257.69, economia: 132.64, desconto: 29.2553 },
  { disponibilidade: true, fioB: false, valorAndrade: 223.29, economia: 167.04, desconto: 36.8423 },
  { disponibilidade: false, fioB: false, valorAndrade: 208.94, economia: 181.36, desconto: 40 },
];

for (const cenario of cenariosGd2) {
  const descricao = `${cenario.disponibilidade ? "repassa" : "absorve"} disponibilidade e ${cenario.fioB ? "repassa" : "absorve"} Fio B`;

  test(`GD II por injecao: ${descricao}`, () => {
    const unificada = calcularFaturaUnificada({
      ...faturaRealGd2Injecao,
      repassarCustoDisponibilidade: cenario.disponibilidade,
      repassarDiferencaFioBGD2: cenario.fioB,
    });
    const separada = calcularFaturaUnificada({
      ...faturaRealGd2Injecao,
      repassarCustoDisponibilidade: cenario.disponibilidade,
      repassarDiferencaFioBGD2: cenario.fioB,
      faturaSomenteAndrade: true,
    });

    assert.equal(unificada.baseCalculoKwh, 375);
    assert.equal(unificada.valorEnergiaCheia, 453.4);
    assert.equal(unificada.valorUsina, cenario.valorAndrade);
    assert.equal(unificada.valorTotalUnificado, Number((128.17 + cenario.valorAndrade).toFixed(2)));
    assert.equal(separada.valorTotalUnificado, cenario.valorAndrade);
    assert.equal(unificada.economiaReal, cenario.economia);
    assert.equal(separada.economiaReal, cenario.economia);
    assert.equal(unificada.descontoRealPercentual, cenario.desconto);
    assert.ok(unificada.descontoRealPercentual <= 40);
  });
}

test("GD I ignora Fio B e varia somente com a disponibilidade", () => {
  const repassando = calcularFaturaUnificada({
    ...faturaRealGd2Injecao,
    diferencaFioBRepassavel: 0,
    repassarCustoDisponibilidade: true,
    repassarDiferencaFioBGD2: false,
  });
  const absorvendo = calcularFaturaUnificada({
    ...faturaRealGd2Injecao,
    diferencaFioBRepassavel: 0,
    repassarCustoDisponibilidade: false,
    repassarDiferencaFioBGD2: false,
  });

  assert.equal(repassando.valorAbsorvidoFioB, 0);
  assert.equal(absorvendo.valorAbsorvidoFioB, 0);
  assert.equal(Number((repassando.valorUsina - absorvendo.valorUsina).toFixed(2)), 14.35);
});

test("compensacao usa energia compensada e injecao usa energia injetada", () => {
  const injecao = calcularFaturaUnificada(faturaRealGd2Injecao);
  const compensacao = calcularFaturaUnificada({
    ...faturaRealGd2Injecao,
    modalidade: "COMPENSACAO",
  });

  assert.equal(injecao.baseCalculoKwh, 375);
  assert.equal(compensacao.baseCalculoKwh, 303);
});

test("matriz completa de modalidades, repasses e formatos preserva as invariantes", () => {
  for (const modalidade of ["INJECAO", "COMPENSACAO"] as const) {
    for (const repassarDisponibilidade of [true, false]) {
      for (const repassarFioB of [true, false]) {
        for (const somenteAndrade of [true, false]) {
          const resultado = calcularFaturaUnificada({
            ...faturaRealGd2Injecao,
            modalidade,
            repassarCustoDisponibilidade: repassarDisponibilidade,
            repassarDiferencaFioBGD2: repassarFioB,
            faturaSomenteAndrade: somenteAndrade,
          });
          const baseEsperada = modalidade === "INJECAO" ? 375 : 303;

          assert.equal(resultado.baseCalculoKwh, baseEsperada);
          assert.ok(resultado.valorUsina >= 0);
          assert.ok(resultado.economiaReal >= 0);
          assert.ok(resultado.descontoRealPercentual >= 0);
          assert.ok(resultado.descontoRealPercentual <= 40);
          assert.equal(
            resultado.valorTotalUnificado,
            Number((resultado.valorUsina + (somenteAndrade ? 0 : 128.17)).toFixed(2)),
          );
          assert.equal(resultado.valorAbsorvidoDisponibilidade > 0, !repassarDisponibilidade);
          assert.equal(resultado.valorAbsorvidoFioB > 0, !repassarFioB);
        }
      }
    }
  }
});
