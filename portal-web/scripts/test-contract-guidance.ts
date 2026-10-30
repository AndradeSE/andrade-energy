import assert from "node:assert/strict";
import test from "node:test";
import { contractGuidance } from "../src/contractGuidance.ts";

test("aviso de fatura explica a janela de cinco dias sem confundir contrato", () => {
  const answer = contractGuidance("Como recebo aviso da fatura?", "CONSUMIDOR");
  assert.match(answer ?? "", /cinco dias/);
  assert.match(answer ?? "", /pagas ou canceladas/);
  assert.doesNotMatch(answer ?? "", /30 dias/);
});

test("regras de contrato incluem novo aceite e confirmação do desligamento", () => {
  const answer = contractGuidance("Quero entender a renovação e o aviso do contrato", "GERADOR");
  assert.match(answer ?? "", /novo aceite/);
  assert.match(answer ?? "", /90 dias/);
  assert.match(answer ?? "", /data e protocolo/);
  assert.match(answer ?? "", /não geram novo faturamento/);
});

test("a orientação genérica não substitui uma consulta privada de vencimento", () => {
  assert.equal(contractGuidance("Qual o vencimento da minha fatura?", "CONSUMIDOR"), undefined);
});
