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

test("extrai próxima leitura separada por conteúdo do quadro", () => {
  const dados = parseCemigConvencional("PRÓXIMA DATA DE LEITURA\nPREVISÃO DA CONCESSIONÁRIA\n18.10.2026");
  assert.equal(dados.proximaLeitura, "18/10/2026");
});

test("extrai data da próxima leitura no rótulo usado pela concessionária", () => {
  const dados = parseCemigGD("DATA DA PRÓXIMA LEITURA\nPREVISTA PARA 19/10/2026");
  assert.equal(dados.proximaLeitura, "19/10/2026");
});

test("extrai próxima leitura compactada sem ano usando a competência", () => {
  const dados = parseCemigGD(`
    JUL/2026 17/08/2026 128,17
    Datas de Leitura
    Residencial Convencional B1 Anterior Atual Nº de dias Próxima
    Bifásico18/0621/07 3320/08
  `);
  assert.equal(dados.proximaLeitura, "20/08/2026");
});
