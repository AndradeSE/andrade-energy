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
