import assert from "node:assert/strict";
import test from "node:test";

import { extrairMedicaoCemig } from "./cemig.medicao.parser";

test("soma apenas injecao e preserva medidores no mes da troca", () => {
  const texto = [
    "Energia kWhGPC26210280800400",
    "Energia InjetadaGPC26210280800400",
    "Energia kWhAPK2581690092.8003.2381438",
  ].join("\n");
  const resultado = extrairMedicaoCemig(texto);

  assert.equal(resultado.medicoes.length, 3);
  assert.deepEqual(resultado.medicoes[2], {
    tipo: "CONSUMO",
    medidor: "APK258169009",
    leituraAnterior: 2800,
    leituraAtual: 3238,
    fatorMultiplicacao: 1,
    energiaKwh: 438,
  });
  assert.equal(resultado.producaoMensal, 0);
});

test("usa somente o medidor presente nas competencias seguintes", () => {
  const texto = [
    "Energia kWhGPC2621028081.0001.01040400",
    "Energia InjetadaGPC2621028082.0002.00640240",
  ].join("\n");
  const resultado = extrairMedicaoCemig(texto);

  assert.equal(resultado.medicoes.length, 2);
  assert.equal(resultado.medicoes[0].fatorMultiplicacao, 40);
  assert.equal(resultado.medicoes[0].energiaKwh, 400);
  assert.equal(resultado.medicoes[1].energiaKwh, 240);
  assert.equal(resultado.producaoMensal, 240);
});

test("interpreta a linha compactada de energia injetada da fatura atual", () => {
  const resultado = extrairMedicaoCemig([
    "Energia kWhART2304163896.3386.6411303",
    "Energia InjetadaART2304163899.1719.5461375",
  ].join("\n"));

  assert.equal(resultado.medicoes.length, 2);
  assert.equal(resultado.medicoes[1].tipo, "INJECAO");
  assert.equal(resultado.medicoes[1].energiaKwh, 375);
  assert.equal(resultado.producaoMensal, 375);
});

test("interpreta ponto como milhar e valida constante 120", () => {
  const resultado = extrairMedicaoCemig("Energia kWh BPD254017913 72 117 120 5.400");

  assert.equal(resultado.leituraAnterior, 72);
  assert.equal(resultado.leituraAtual, 117);
  assert.equal(resultado.fatorMultiplicacao, 120);
  assert.equal(resultado.medicoes[0].energiaKwh, 5400);
});

test("aceita formato antigo com leituras de milhar e dois medidores", () => {
  const resultado = extrairMedicaoCemig([
    "Energia kWh ARK191032624 0 236 1 236",
    "Energia kWh AHN860003580 97.904 97.999 1 95",
  ].join("\n"));

  assert.equal(resultado.medicoes.length, 2);
  assert.equal(resultado.medicoes[1].leituraAnterior, 97904);
  assert.equal(resultado.medicoes[1].energiaKwh, 95);
});

test("aceita constante decimal do layout legado", () => {
  const resultado = extrairMedicaoCemig("Energia kWh ABC123456789 67.605 68.873 1,00000 1.268");

  assert.equal(resultado.fatorMultiplicacao, 1);
  assert.equal(resultado.medicoes[0].energiaKwh, 1268);
});

test("aceita o rótulo Energia Elétrica usado em outros layouts", () => {
  const resultado = extrairMedicaoCemig("Energia Elétrica ABA001009185 10.321 10.424 1 103");

  assert.equal(resultado.fatorMultiplicacao, 1);
  assert.equal(resultado.medicoes[0].energiaKwh, 103);
});
