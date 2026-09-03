import assert from "node:assert/strict";
import test from "node:test";

import { parseCemigConvencional } from "./cemig.convencional.parser";
import { parseCemigGD } from "./cemig.gd.parser";

test("extrai próxima leitura quando a data vem depois do rótulo", () => {
  const dados = parseCemigConvencional("Próxima leitura: 16/10/2026");
  assert.equal(dados.proximaLeitura, "16/10/2026");
});

test("extrai próxima leitura quando a data vem antes do rótulo", () => {
  const dados = parseCemigGD("17/10/2026  Próxima Leitura");
  assert.equal(dados.proximaLeitura, "17/10/2026");
});
