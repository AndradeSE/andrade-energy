import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCemigConvencional } from "./cemig.convencional.parser";

const texto = `OUT/2026 05/11/2026 360,80
Energia até 120kWh 120 0,95927401 115,08 5,16 115,08 18,00 20,71 0,74349875
Energia acima de 120kWh 94 1,17455946 110,39 4,95 110,39 18,00 19,87 0,91035875
Multa 2% sobre conta de 09/2026 5,33
Doação LBV - 0800-0555099 130,00
OUT/26 214 6,68 32
Bifásico Desconto Social`;

test("usa a tarifa convencional para desconto e separa doação da energia", () => {
  const dados = parseCemigConvencional(texto);
  assert.equal(dados.descontoSocial, true);
  assert.equal(dados.consumo, 214);
  assert.equal(dados.tarifaCheia, 1.17455946);
  assert.equal(dados.tarifaDisponibilidadeSemImpostos, 0.91035875);
  assert.equal(dados.valorTotal, 360.8);
  assert.equal(dados.valorEnergiaConcessionaria, 225.47);
  assert.equal(dados.valorDoacoes, 130);
  assert.ok(Math.abs(dados.encargosAdicionais! - 135.33) < 0.00001);
  assert.equal(dados.tipoLigacao, "BIFASICO");
});

test("reconhece o cabeçalho reorganizado pelo OCR de uma foto", () => {
  const dados = parseCemigConvencional(texto.replace("OUT/2026 05/11/2026 360,80", "OUT/2026 05/11/2026\nValor a pagar (R$)\n360,80"));
  assert.equal(dados.valorTotal, 360.8);
  assert.equal(dados.referencia, "OUT/2026");
});

test("não confunde a tarifa social com a convencional quando falta a segunda faixa", () => {
  const dados = parseCemigConvencional(texto.replace(/^Energia acima[^\n]*\n/m, ""));
  assert.equal(dados.tarifaCheia, 0);
});
