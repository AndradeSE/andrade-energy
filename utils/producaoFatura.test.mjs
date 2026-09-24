import assert from "node:assert/strict";
import test from "node:test";
import { producaoMedidaDaFatura } from "./producaoFatura.ts";

test("usa somente medições de injeção, nunca consumo da UC geradora", () => {
  assert.equal(producaoMedidaDaFatura({ medicoes: [
    { tipo: "CONSUMO", energiaKwh: 900 },
    { tipo: "INJECAO", energiaKwh: 320 },
    { tipo: "INJECAO", energiaKwh: 180 },
  ], producaoMensal: 700 }), 500);
});

test("usa produção mensal ou energia injetada quando não há medição discriminada", () => {
  assert.equal(producaoMedidaDaFatura({ producaoMensal: 650, energiaInjetada: 400 }), 650);
  assert.equal(producaoMedidaDaFatura({ energiaInjetada: 400 }), 400);
  assert.equal(producaoMedidaDaFatura({ medicoes: [{ tipo: "CONSUMO", energiaKwh: 900 }] }), 0);
});
