import assert from "node:assert/strict";
import test from "node:test";

import { calcularPropostaComercial, gerarPropostaPdf } from "./propostaConvite.service";

const base = {
  consumo: 68,
  tarifaCheia: 1.18002201,
  descontoContratado: 40,
  tipoGd: "GD2",
  custoDisponibilidade: 30 * (1.18002201 - 0.92214),
  diferencaFioB: 68 * (0.62352 - 0.4626174),
};

test("preserva a matriz comercial GD2 aprovada", () => {
  const repassaTudo = calcularPropostaComercial({ ...base, absorveDisponibilidade: false, absorveFioB: false });
  const absorveDisponibilidade = calcularPropostaComercial({ ...base, absorveDisponibilidade: true, absorveFioB: false });
  const absorveFioB = calcularPropostaComercial({ ...base, absorveDisponibilidade: false, absorveFioB: true });
  const absorveTudo = calcularPropostaComercial({ ...base, absorveDisponibilidade: true, absorveFioB: true });

  assert.equal(repassaTudo.descontoReal.toFixed(2), "16.72");
  assert.equal(absorveDisponibilidade.descontoReal.toFixed(2), "26.36");
  assert.equal(absorveFioB.descontoReal.toFixed(2), "30.36");
  assert.equal(absorveTudo.descontoReal.toFixed(2), "40.00");
});

test("GD1 nunca aplica Fio B", () => {
  const resultado = calcularPropostaComercial({ ...base, tipoGd: "GD1", absorveDisponibilidade: true, absorveFioB: false });
  assert.equal(resultado.fioB, 0);
  assert.ok(resultado.descontoReal <= 40);
});

test("proposta comercial ocupa exatamente duas paginas", async () => {
  const historicoMensal = Array.from({ length: 6 }, (_, indice) => ({
    referencia: `0${indice + 1}/2026`,
    semBeneficio: 300,
    comBeneficio: 190,
    economia: 110,
  }));
  const pdf = await gerarPropostaPdf({
    empresa: "Andrade Energy",
    uc: "123456789",
    tipoGd: "GD2",
    cliente: "Cliente de teste",
    usina: "Usina de teste",
    historicoMensal,
    descontoContratado: 40,
    descontoReal: 36,
    economiaMensal: 110,
    consumo: 300,
    base: 360,
    valorAndrade: 216,
    disponibilidade: 20,
    fioB: 12,
    totalProjetado: 248,
    possuiGd: false,
  });
  const paginas = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [];
  assert.equal(paginas.length, 2);
});
