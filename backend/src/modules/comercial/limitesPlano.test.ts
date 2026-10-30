import assert from "node:assert/strict";
import test from "node:test";
import { validarLimitePlano } from "./limitesPlano";

test("permite cadastrar enquanto houver capacidade", () => {
  assert.doesNotThrow(() => validarLimitePlano(0, 1, "usinas"));
  assert.doesNotThrow(() => validarLimitePlano(99, 100, "clientes"));
});

test("bloqueia no limite de cada plano", () => {
  assert.throws(() => validarLimitePlano(1, 1, "usinas"), /até 1 usinas/);
  assert.throws(() => validarLimitePlano(500, 500, "clientes"), /até 500 clientes/);
});

test("limite nulo permanece ilimitado", () => {
  assert.doesNotThrow(() => validarLimitePlano(10000, null, "clientes"));
});
